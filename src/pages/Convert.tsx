import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, FileText, Check, Download, Music, ChevronDown } from "lucide-react";

// Hidden page — not linked anywhere. Pure client-side Spotify CSV → Apple Music XML converter.

const xmlEscape = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

// Minimal RFC4180-ish CSV parser (handles quoted fields, embedded commas, escaped quotes, CRLF).
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ",") {
        row.push(field);
        field = "";
      } else if (c === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else if (c === "\r") {
        // skip; \n will close the row
      } else {
        field += c;
      }
    }
  }
  // flush trailing
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  // remove trailing empty row(s)
  while (rows.length && rows[rows.length - 1].every((v) => v === "")) rows.pop();
  return rows;
}

interface Track {
  id: number;
  name: string;
  artist: string;
  album: string;
  durationMs: number;
  discNumber: number;
  trackNumber: number;
}

function buildXml(
  playlistName: string,
  tracks: Track[],
  options: { includeAlbum: boolean } = { includeAlbum: true }
): string {
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

  const trackDictEntries = tracks
    .map((t) => {
      return `\t\t<key>${t.id}</key>
\t\t<dict>
\t\t\t<key>Track ID</key><integer>${t.id}</integer>
\t\t\t<key>Name</key><string>${xmlEscape(t.name)}</string>
\t\t\t<key>Artist</key><string>${xmlEscape(t.artist)}</string>
${options.includeAlbum ? `\t\t\t<key>Album</key><string>${xmlEscape(t.album)}</string>\n` : ""}\
\t\t\t<key>Total Time</key><integer>${t.durationMs}</integer>
\t\t\t<key>Disc Number</key><integer>${t.discNumber}</integer>
\t\t\t<key>Track Number</key><integer>${t.trackNumber}</integer>
\t\t\t<key>Date Added</key><date>${now}</date>
\t\t\t<key>Persistent ID</key><string>${t.id.toString(16).toUpperCase().padStart(16, "0")}</string>
\t\t\t<key>Track Type</key><string>File</string>
\t\t</dict>`;
    })
    .join("\n");

  const playlistItems = tracks
    .map((t) => `\t\t\t\t<dict><key>Track ID</key><integer>${t.id}</integer></dict>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>Major Version</key><integer>1</integer>
\t<key>Minor Version</key><integer>1</integer>
\t<key>Date</key><date>${now}</date>
\t<key>Application Version</key><string>12.12.0.9</string>
\t<key>Features</key><integer>5</integer>
\t<key>Show Content Ratings</key><true/>
\t<key>Tracks</key>
\t<dict>
${trackDictEntries}
\t</dict>
\t<key>Playlists</key>
\t<array>
\t\t<dict>
\t\t\t<key>Name</key><string>${xmlEscape(playlistName)}</string>
\t\t\t<key>Playlist ID</key><integer>1</integer>
\t\t\t<key>Playlist Persistent ID</key><string>0000000000000001</string>
\t\t\t<key>All Items</key><true/>
\t\t\t<key>Playlist Items</key>
\t\t\t<array>
${playlistItems}
\t\t\t</array>
\t\t</dict>
\t</array>
</dict>
</plist>
`;
}

function csvToTracks(csvText: string): Track[] {
  const rows = parseCsv(csvText);
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.trim());
  const idx = (name: string) => header.indexOf(name);

  const iName = idx("Track Name");
  const iArtist = idx("Artist Name(s)");
  const iAlbum = idx("Album Name");
  const iDur = idx("Duration (ms)");
  const iDisc = idx("Disc Number");
  const iTrack = idx("Track Number");

  const tracks: Track[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row || row.every((v) => v === "")) continue;
    const name = (iName >= 0 ? row[iName] : "") || "";
    if (!name.trim()) continue;

    const rawArtist = (iArtist >= 0 ? row[iArtist] : "") || "";
    const artist = rawArtist.split(",")[0].trim();
    const album = (iAlbum >= 0 ? row[iAlbum] : "") || "";
    const durRaw = (iDur >= 0 ? row[iDur] : "") || "";
    const durationMs = Number.parseInt(durRaw, 10);
    const discRaw = (iDisc >= 0 ? row[iDisc] : "") || "";
    const discNumber = Number.parseInt(discRaw, 10);
    const trackRaw = (iTrack >= 0 ? row[iTrack] : "") || "";
    const trackNumber = Number.parseInt(trackRaw, 10);

    tracks.push({
      id: tracks.length + 1,
      name,
      artist,
      album,
      durationMs: Number.isFinite(durationMs) ? durationMs : 0,
      discNumber: Number.isFinite(discNumber) ? discNumber : 1,
      trackNumber: Number.isFinite(trackNumber) ? trackNumber : tracks.length + 1,
    });
  }
  return tracks;
}

const Convert = () => {
  const [file, setFile] = useState<File | null>(null);
  const [playlistName, setPlaylistName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [enrich, setEnrich] = useState(true);
  const [includeAlbum, setIncludeAlbum] = useState(false);
  const [enrichState, setEnrichState] = useState<
    | { phase: "idle" }
    | { phase: "enriching"; current: number; total: number; trackName: string }
    | {
        phase: "ready";
        tracks: Track[];
        playlistName: string;
        updated: number;
        unchanged: number;
        notFound: number;
        diffs: { before: Track; after: Track }[];
      }
  >({ phase: "idle" });
  const inputRef = useRef<HTMLInputElement>(null);

  const onPickFile = (f: File | null | undefined) => {
    setError(null);
    setSuccessCount(null);
    setEnrichState({ phase: "idle" });
    if (!f) return;
    if (!/\.csv$/i.test(f.name)) {
      setError("Please select a .csv file");
      return;
    }
    setFile(f);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    onPickFile(f);
  }, []);

  const downloadXml = (name: string, tracks: Track[], withAlbum: boolean) => {
    const xml = buildXml(name, tracks, { includeAlbum: withAlbum });
    const blob = new Blob([xml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "output.xml";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const onConvert = async () => {
    if (!file) {
      setError("Choose a CSV file first");
      return;
    }
    setBusy(true);
    setError(null);
    setSuccessCount(null);
    setEnrichState({ phase: "idle" });
    try {
      const text = await file.text();
      const tracks = csvToTracks(text);
      if (tracks.length === 0) {
        setError("No tracks found in this CSV");
        setBusy(false);
        return;
      }
      const name = playlistName.trim() || file.name.replace(/\.csv$/i, "");

      if (!enrich) {
        downloadXml(name, tracks, includeAlbum);
        setSuccessCount(tracks.length);
        setBusy(false);
        return;
      }

      // Enrichment phase
      const enriched: Track[] = [];
      const diffs: { before: Track; after: Track }[] = [];
      let updated = 0;
      let unchanged = 0;
      let notFound = 0;

      for (let i = 0; i < tracks.length; i++) {
        const t = tracks[i];
        setEnrichState({
          phase: "enriching",
          current: i + 1,
          total: tracks.length,
          trackName: t.name,
        });

        let nextTrack = t;
        let matched = false;
        try {
          const q = `recording:"${t.name.replace(/"/g, '\\"')}" AND artist:"${t.artist.replace(/"/g, '\\"')}"`;
          const url = `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(q)}&fmt=json&limit=1`;
          const res = await fetch(url, {
            headers: { Accept: "application/json" },
          });
          if (res.ok) {
            const json = await res.json();
            const rec = json?.recordings?.[0];
            if (rec && typeof rec.score === "number" && rec.score >= 85) {
              matched = true;
              const newName = rec.title || t.name;
              const newArtist = rec["artist-credit"]?.[0]?.name || t.artist;
              const newAlbum = rec.releases?.[0]?.title || t.album;
              nextTrack = {
                ...t,
                name: newName,
                artist: newArtist,
                album: newAlbum,
              };
            }
          }
        } catch {
          // network/parse error — keep original silently
        }

        enriched.push(nextTrack);
        if (!matched) {
          notFound++;
        } else if (
          nextTrack.name === t.name &&
          nextTrack.artist === t.artist &&
          nextTrack.album === t.album
        ) {
          unchanged++;
        } else {
          updated++;
          diffs.push({ before: t, after: nextTrack });
        }

        // Rate limit: 1 req/sec, skip after last
        if (i < tracks.length - 1) {
          await new Promise((r) => setTimeout(r, 1000));
        }
      }

      setEnrichState({
        phase: "ready",
        tracks: enriched,
        playlistName: name,
        updated,
        unchanged,
        notFound,
        diffs,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-5xl space-y-8">
      <Card className="w-full max-w-xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Spotify → Apple Music</CardTitle>
          <CardDescription>
            Convert an exportify.net CSV into an iTunes Library XML. Everything runs in your browser — nothing
            is uploaded.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => onPickFile(e.target.files?.[0])}
            />
            {file ? (
              <div className="flex items-center justify-center gap-2 text-sm">
                <FileText className="h-5 w-5 text-primary" />
                <span className="font-medium">{file.name}</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Upload className="h-8 w-8" />
                <p className="text-sm">Drop a .csv here, or click to browse</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="playlist-name" className="text-sm font-medium">
              Playlist name <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Input
              id="playlist-name"
              placeholder={file ? file.name.replace(/\.csv$/i, "") : "Defaults to the filename"}
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
            />
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="enrich"
              checked={enrich}
              onCheckedChange={(v) => setEnrich(v === true)}
              disabled={busy}
              className="mt-0.5"
            />
            <label htmlFor="enrich" className="text-sm leading-5 cursor-pointer select-none">
              Enrich metadata via MusicBrainz{" "}
              <span className="text-muted-foreground">(improves Apple Music matching)</span>
            </label>
          </div>

          {enrichState.phase === "enriching" ? (
            <div className="space-y-2">
              <Progress value={(enrichState.current / enrichState.total) * 100} />
              <p className="text-sm text-muted-foreground">
                Checking track {enrichState.current} of {enrichState.total} —{" "}
                <span className="font-medium text-foreground">"{enrichState.trackName}"</span>
              </p>
            </div>
          ) : enrichState.phase === "ready" ? (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <p className="text-sm">
                  <span className="font-semibold text-primary">{enrichState.updated}</span> tracks updated,{" "}
                  <span className="font-semibold">{enrichState.unchanged}</span> already correct,{" "}
                  <span className="font-semibold">{enrichState.notFound}</span> not found
                </p>
                {enrichState.diffs.length > 0 && (
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                      <ChevronDown className="h-4 w-4" />
                      Show changes ({enrichState.diffs.length})
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-3">
                      <div className="rounded-md border bg-background overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Spotify</TableHead>
                              <TableHead>MusicBrainz</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {enrichState.diffs.map((d, i) => (
                              <TableRow key={i}>
                                <TableCell className="align-top text-xs">
                                  <div className="font-medium">{d.before.name}</div>
                                  <div className="text-muted-foreground">{d.before.artist}</div>
                                  <div className="text-muted-foreground italic">{d.before.album}</div>
                                </TableCell>
                                <TableCell className="align-top text-xs">
                                  <div className="font-medium">{d.after.name}</div>
                                  <div className="text-muted-foreground">{d.after.artist}</div>
                                  <div className="text-muted-foreground italic">{d.after.album}</div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
              <Button
                onClick={() => {
                  downloadXml(enrichState.playlistName, enrichState.tracks, includeAlbum);
                  setSuccessCount(enrichState.tracks.length);
                }}
                className="w-full"
              >
                <Download className="h-4 w-4" />
                Download XML
              </Button>
            </div>
          ) : (
            <Button onClick={onConvert} disabled={busy || !file} className="w-full">
              {busy ? "Converting…" : "Convert"}
            </Button>
          )}

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          {successCount !== null && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <Check className="h-4 w-4" />
              <span>Converted {successCount} track{successCount === 1 ? "" : "s"} — output.xml downloaded.</span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="overflow-hidden border-primary/10">
          <CardHeader className="bg-gradient-to-br from-primary/10 to-transparent">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center">
                <Download className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Get a playlist CSV</CardTitle>
                <CardDescription>Export from Spotify</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <ol className="space-y-4">
              {[
                <>Go to <a href="https://exportify.net" target="_blank" rel="noreferrer" className="text-primary font-medium hover:underline">exportify.net</a></>,
                <>Log in with Spotify</>,
                <>Click <span className="font-medium">Export</span> next to a playlist</>,
                <>Save the <code className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">.csv</code> file</>,
              ].map((text, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="text-foreground/90 leading-6">{text}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-primary/10">
          <CardHeader className="bg-gradient-to-br from-primary/10 to-transparent">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center">
                <Music className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Import into Apple Music</CardTitle>
                <CardDescription>On your Mac</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <ol className="space-y-4">
              {[
                <>Use this tool to produce <code className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">output.xml</code></>,
                <>Open <span className="font-medium">Apple Music</span> on Mac</>,
                <>Choose <span className="font-medium">File → Library → Import Playlist</span></>,
                <>Select <code className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">output.xml</code></>,
              ].map((text, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="flex-shrink-0 h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="text-foreground/90 leading-6">{text}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
};

export default Convert;