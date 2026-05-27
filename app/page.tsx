import { getOrCreateCurrentLeague, getLeagues, getStandings } from '@/lib/golf-db';
import { weekLabel } from '@/lib/golf-scoring';
import GolfStandingsPage from '@/components/GolfStandingsPage';

export const revalidate = 30;

export default async function GolfHome() {
  const [currentLeague, allLeagues] = await Promise.all([
    getOrCreateCurrentLeague(),
    getLeagues(),
  ]);

  const standings = await getStandings(currentLeague.id);
  const playersWithRounds = standings.filter(r => r.roundsPlayed > 0).length;
  const totalRounds = standings.reduce((s, r) => s + r.roundsPlayed, 0);

  return (
    <GolfStandingsPage
      currentLeague={currentLeague}
      allLeagues={allLeagues}
      initialStandings={standings}
      stats={{ playersWithRounds, totalRounds, totalPlayers: standings.length }}
      initialLabel={weekLabel(currentLeague.start_date)}
    />
  );
}
