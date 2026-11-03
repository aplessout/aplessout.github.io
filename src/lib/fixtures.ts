import { db, type Category, type LiveChannel, type Movie, type Series } from '../db';

const poster = (seed: string) => `https://picsum.photos/seed/${encodeURIComponent(seed)}/400/600`;

const liveNames = [
  'Sky Sports Main Event',
  'TNT Sports 1',
  'BBC One HD',
  'ITV1 HD',
  'Channel 4 HD',
  'Sky Cinema Premiere',
  'Discovery Channel',
  'National Geographic',
  'Eurosport 1',
  'Sky Atlantic',
  'Comedy Central',
  'MTV Live HD',
  'Cartoon Network',
  'CNN International',
  'Bloomberg TV',
  'Sky News',
  'Dave',
  'Animal Planet',
  'Food Network',
  'Sky Sports F1',
];

const movieTitles: Array<[string, string, string]> = [
  ['Dune: Part Two', '2024', '8.5'],
  ['Oppenheimer', '2023', '8.3'],
  ['The Batman', '2022', '7.8'],
  ['Everything Everywhere All at Once', '2022', '7.8'],
  ['Blade Runner 2049', '2017', '8.0'],
  ['Arrival', '2016', '7.9'],
  ['Mad Max: Fury Road', '2015', '8.1'],
  ['Interstellar', '2014', '8.7'],
  ['Whiplash', '2014', '8.5'],
  ['Prisoners', '2013', '8.1'],
  ['The Grand Budapest Hotel', '2014', '8.1'],
  ['Nightcrawler', '2014', '7.8'],
  ['Sicario', '2015', '7.6'],
  ['La La Land', '2016', '8.0'],
  ['Get Out', '2017', '7.8'],
  ['The Social Network', '2010', '7.8'],
  ['Inception', '2010', '8.8'],
  ['No Country for Old Men', '2007', '8.2'],
  ['There Will Be Blood', '2007', '8.2'],
  ['The Departed', '2006', '8.5'],
  ['Children of Men', '2006', '7.9'],
  ['Eternal Sunshine of the Spotless Mind', '2004', '8.3'],
  ['Oldboy', '2003', '8.4'],
  ['City of God', '2002', '8.6'],
  ['Spirited Away', '2001', '8.6'],
  ['Memento', '2000', '8.4'],
  ['Fight Club', '1999', '8.8'],
  ['The Matrix', '1999', '8.7'],
  ['Heat', '1995', '8.3'],
  ['Pulp Fiction', '1994', '8.9'],
];

const seriesTitles: Array<[string, string, string]> = [
  ['Severance', '2022', '8.7'],
  ['The Bear', '2022', '8.6'],
  ['Succession', '2018', '8.9'],
  ['Chernobyl', '2019', '9.4'],
  ['Better Call Saul', '2015', '9.0'],
  ['Fargo', '2014', '8.9'],
  ['True Detective', '2014', '8.9'],
  ['Peaky Blinders', '2013', '8.8'],
  ['Breaking Bad', '2008', '9.5'],
  ['Mad Men', '2007', '8.7'],
  ['The Wire', '2002', '9.3'],
  ['The Sopranos', '1999', '9.2'],
  ['Dark', '2017', '8.7'],
  ['Andor', '2022', '8.4'],
];

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function seedDemo(): Promise<void> {
  const categories: Category[] = [
    { id: 'live:sports', kind: 'live', name: 'Sports' },
    { id: 'live:entertainment', kind: 'live', name: 'Entertainment' },
    { id: 'live:news', kind: 'live', name: 'News' },
    { id: 'movie:featured', kind: 'movie', name: 'Featured' },
    { id: 'movie:scifi', kind: 'movie', name: 'Sci-Fi' },
    { id: 'movie:drama', kind: 'movie', name: 'Drama' },
    { id: 'series:trending', kind: 'series', name: 'Trending' },
    { id: 'series:crime', kind: 'series', name: 'Crime' },
  ];

  const live: LiveChannel[] = liveNames.map((name, index) => ({
    id: `demo-live-${index}`,
    categoryId: index < 5 ? 'live:sports' : index < 15 ? 'live:entertainment' : 'live:news',
    name,
    icon: poster(slugify(name)),
    num: index + 1,
  }));

  const movies: Movie[] = movieTitles.map(([name, year, rating], index) => ({
    id: `demo-movie-${index}`,
    categoryId: index % 2 === 0 ? 'movie:featured' : 'movie:drama',
    name,
    icon: poster(slugify(name)),
    year,
    rating,
    ext: 'mp4',
    added: Math.floor(Date.now() / 1000) - index * 86400,
  }));

  const series: Series[] = seriesTitles.map(([name, year, rating], index) => ({
    id: `demo-series-${index}`,
    categoryId: index % 2 === 0 ? 'series:trending' : 'series:crime',
    name,
    icon: poster(slugify(name)),
    year,
    rating,
    plot: 'Demo series entry used to exercise the interface before a provider is connected.',
  }));

  await db.transaction('rw', [db.categories, db.live, db.movies, db.series], async () => {
    await db.categories.bulkPut(categories);
    await db.live.bulkPut(live);
    await db.movies.bulkPut(movies);
    await db.series.bulkPut(series);
  });
}
