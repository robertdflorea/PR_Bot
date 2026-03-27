import './globals.css';

export const metadata = { title: 'PR Bot', description: 'PR Writer assistant bot' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
