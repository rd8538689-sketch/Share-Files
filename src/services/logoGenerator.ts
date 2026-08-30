export const generateLogo = async () => {
  // We use a high-quality, unique SVG logo to ensure reliability and avoid API permission issues.
  // This logo is designed to be iconic and recognizable, similar to Google Drive or Mediafire.
  const svgLogo = `
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="128" fill="#030303"/>
  <path d="M120 180C120 157.909 137.909 140 160 140H240L290 190H352C374.091 190 392 207.909 392 230V332C392 354.091 374.091 372 352 372H160C137.909 372 120 354.091 120 332V180Z" fill="#121212" stroke="#00FF9D" stroke-width="16"/>
  <path d="M256 220V310M256 220L220 256M256 220L292 256" stroke="#00FF9D" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="256" cy="275" r="50" stroke="#00FF9D" stroke-width="2" stroke-dasharray="10 10" opacity="0.4"/>
</svg>
  `.trim();

  const logoData = `data:image/svg+xml;base64,${btoa(svgLogo)}`;
  return logoData;
};
