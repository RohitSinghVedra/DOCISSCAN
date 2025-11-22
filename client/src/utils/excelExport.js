/**
 * Excel Export Utility
 * Exports document data to Excel format (CSV that opens in Excel)
 */

/**
 * Convert documents array to CSV format
 * @param {Array} documents - Array of document objects
 * @returns {string} CSV string
 */
export const documentsToCSV = (documents) => {
  if (!documents || documents.length === 0) {
    return '';
  }

  // Define CSV headers
  const headers = [
    'Timestamp',
    'Document Type',
    'Name',
    'ID Number',
    'Date of Birth',
    'Gender',
    'Address',
    'Father Name',
    'Husband Name',
    'Nationality',
    'Issue Date',
    'Expiry Date',
    'Place of Issue',
    'District',
    'State',
    'Pincode',
    'Other Info 1',
    'Other Info 2',
    'Raw Text'
  ];

  // Convert documents to rows
  const rows = documents.map(doc => {
    const data = doc.extractedData || {};
    const scannedAt = doc.scannedAt ? new Date(doc.scannedAt).toISOString() : '';
    
    return [
      scannedAt,
      doc.documentType || '',
      data.name || '',
      data.idNumber || data.aadhaarNumber || data.passportNumber || data.panNumber || data.drivingLicenseNumber || data.voterIdNumber || '',
      data.dateOfBirth || '',
      data.gender || '',
      data.address || '',
      data.fatherName || '',
      data.husbandName || '',
      data.nationality || '',
      data.issueDate || '',
      data.expiryDate || '',
      data.placeOfIssue || '',
      data.district || '',
      data.state || '',
      data.pincode || '',
      data.otherInfo1 || '',
      data.otherInfo2 || '',
      doc.rawText || ''
    ];
  });

  // Escape CSV values (handle commas, quotes, newlines)
  const escapeCSV = (value) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Build CSV string
  const csvRows = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ];

  return csvRows.join('\n');
};

/**
 * Download documents as Excel file (CSV format)
 * @param {Array} documents - Array of document objects
 * @param {string} filename - Filename (default: 'documents_export.csv')
 */
export const exportToExcel = (documents, filename = 'documents_export.csv') => {
  try {
    const csv = documentsToCSV(documents);
    
    if (!csv) {
      throw new Error('No data to export');
    }

    // Create blob with UTF-8 BOM for Excel compatibility
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    
    // Create download link
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    URL.revokeObjectURL(url);
    
    return true;
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw error;
  }
};

