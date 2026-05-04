interface MapPreviewProps {
  lat: number;
  lng: number;
  label?: string;
}

export default function MapPreview({ lat, lng, label }: MapPreviewProps) {
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.01},${lat-0.01},${lng+0.01},${lat+0.01}&layer=mapnik&marker=${lat},${lng}`;
  
  return (
    <div className="rounded-xl overflow-hidden border border-input mt-2">
      <div className="bg-slate-50 px-3 py-1.5 text-xs text-muted-foreground flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-primary inline-block" />
        {label || "Selected location"}
      </div>
      <iframe
        src={mapUrl}
        width="100%"
        height="180"
        style={{ border: "none" }}
        title="Location map"
        loading="lazy"
      />
    </div>
  );
}
