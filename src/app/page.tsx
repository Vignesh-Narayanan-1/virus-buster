import { VirusBusterGame } from '@/components/game/virus-buster';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-2 sm:p-4">
      <VirusBusterGame />
    </main>
  );
}
