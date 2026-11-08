import Script from 'next/script';

export default function Home() {
  return (
    <main>
      <a href="/about">Sobre</a>
      <img src="/logo.png" alt="Logo" />
      <Script>{'console.log("inline")'}</Script>
    </main>
  );
}
