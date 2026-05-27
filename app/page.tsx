import { getOrCreateCurrentLeague, getLeagues, getStandings } from '@/lib/golf-db';
import { weekLabel } from '@/lib/golf-scoring';
import StandingsPage from '@/components/StandingsPage';

export const revalidate = 30;

export default async function Home() {
  const [currentLeague, allLeagues] = await Promise.all([
    getOrCreateCurrentLeague(),
    getLeagues(),
  ]);

  const standings = await getStandings(currentLeague.id);

  const playersWithRounds = standings.filter(r => r.roundsPlayed > 0).length;
  const totalRounds = standings.reduce((s, r) => s + r.roundsPlayed, 0);

  return (
    <StandingsPage
      currentLeague={currentLeague}
      allLeagues={allLeagues}
      initialStandings={standings}
      stats={{ playersWithRounds, totalRounds, totalPlayers: standings.length }}
      initialLabel={weekLabel(currentLeague.start_date)}
    />
  );
}
