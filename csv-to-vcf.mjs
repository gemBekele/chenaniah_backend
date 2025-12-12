import fs from 'fs';

// Read the CSV file
const csvContent = fs.readFileSync('students_export.csv', 'utf-8');
const lines = csvContent.trim().split('\n');

// Skip the header line
const dataLines = lines.slice(1);

// Create VCF content
let vcfContent = '';

for (const line of dataLines) {
  if (!line.trim()) continue; // Skip empty lines
  
  // Parse CSV line (handle commas in names and quoted values)
  const match = line.match(/^(.+?),(.+)$/);
  if (!match) continue;
  
  const fullName = match[1].trim();
  const phone = match[2].trim();
  
  // Skip if name or phone is empty
  if (!fullName || !phone) continue;
  
  // Create VCF entry
  vcfContent += 'BEGIN:VCARD\n';
  vcfContent += 'VERSION:3.0\n';
  vcfContent += `FN:${fullName}\n`;
  vcfContent += `TEL:${phone}\n`;
  vcfContent += 'END:VCARD\n';
  vcfContent += '\n';
}

// Write VCF file
fs.writeFileSync('students_export.vcf', vcfContent, 'utf-8');
console.log(`Successfully converted ${dataLines.length} contacts to students_export.vcf`);



