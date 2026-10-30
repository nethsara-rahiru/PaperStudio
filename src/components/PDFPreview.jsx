import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();
const options = {
  cMapUrl: "/pdfjs/cmaps/",
  standardFontDataUrl: "/pdfjs/standard_fonts/",
};
export default function PDFPreview({ url, zoom = 100 }) {
  const host = useRef(null);
  const [width, setWidth] = useState(500),
    [pages, setPages] = useState(0);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width),
    );
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div
      className="pdf-document"
      ref={host}
      title="Compiled PDF document"
      data-pdf-url={url}
    >
      <Document
        file={url}
        options={options}
        onLoadSuccess={({ numPages }) => setPages(numPages)}
        loading={<p className="pdf-message">Preparing your pages…</p>}
        error={
          <p className="pdf-message">
            Preview could not load. Use the download button to open the PDF.
          </p>
        }
      >
        {Array.from({ length: pages }, (_, index) => (
          <Page
            key={index}
            pageNumber={index + 1}
            width={(Math.max(220, width - 44) * zoom) / 100}
            loading={<p className="pdf-message">Rendering page…</p>}
          />
        ))}
      </Document>
    </div>
  );
}
