import QRCode from 'qrcode';

export async function generateQrCode(url: string): Promise<string> {
  const dataUrl = await QRCode.toDataURL(url, {
    width: 400,
    margin: 2,
    color: { dark: '#000000', light: '#FFFFFF' },
  });
  // Extract base64 part from data URL
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '');
  return base64;
}
