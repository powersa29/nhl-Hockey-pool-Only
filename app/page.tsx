import { getOrCreateCurrentLeague, getLeagues, getStandings, getSeasonStandings, getWeeklyWinners } from '@/lib/golf-db';
import { weekLabel } from '@/lib/golf-scoring';
import GolfStandingsPage from '@/components/GolfStandingsPage';

export const revalidate = 30;

export default async function GolfHome() {
  const [currentLeague, allLeagues] = await Promise.all([
    getOrCreateCurrentLeague(),
    getLeagues(),
  ]);

  const [weekStandings, seasonStandings, weeklyWinners] = await Promise.all([
    getStandings(currentLeague.id),
    getSeasonStandings(),
    getWeeklyWinners(),
  ]);

  const playersWithRounds = weekStandings.filter(r => r.roundsPlayed > 0).length;
  const totalRounds = weekStandings.reduce((s, r) => s + r.roundsPlayed, 0);

  return (
    <GolfStandingsPage
      currentLeague={currentLeague}
      allLeagues={allLeagues}
      initialStandings={weekStandings}
      initialSeasonStandings={seasonStandings}
      weeklyWinners={weeklyWinners}
      stats={{ playersWithRounds, totalRounds, totalPlayers: weekStandings.length }}
      initialLabel={weekLabel(currentLeague.start_date)}
    />
  );
}
