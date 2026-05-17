'use client';

import { PDFDownloadLink } from '@react-pdf/renderer';

/**
 * A client-side PDF Download Link.
 */
export default function DynamicPDFLink({ document, fileName, children, className, ...props }) {
  return (
    <PDFDownloadLink
      document={document} 
      fileName={fileName}
      className={className}
      {...props}
    >
      {children}
    </PDFDownloadLink>
  );
}
