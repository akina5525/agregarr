export interface AwardSubtypeConfig {
  eventId: string;
  categoryMatchers: string[];
  excludeCategoryMatchers?: string[];
  mediaType: 'movie' | 'tv';
  label?: string;
  description?: string;
}

export interface AwardSubtypeDefinition extends AwardSubtypeConfig {
  subtype: string;
}

export const AWARD_SUBTYPE_DEFINITIONS: AwardSubtypeDefinition[] = [
  {
    subtype: 'academy_awards_best_picture_winners',
    label: 'Academy Awards - Best Picture Winners',
    eventId: 'ev0000003',
    categoryMatchers: [
      'best motion picture of the year',
      'best motion picture',
      'best picture',
    ],
    mediaType: 'movie',
    description: 'Best Picture winners from the Academy Awards',
  },
  {
    subtype: 'academy_awards_best_director_winners',
    label: 'Academy Awards - Best Director Winners',
    eventId: 'ev0000003',
    categoryMatchers: ['best achievement in directing', 'best director'],
    mediaType: 'movie',
    description: 'Best Director winners from the Academy Awards',
  },
  {
    subtype: 'berlin_international_film_festival_best_film_winners',
    label: 'Berlin International Film Festival - Golden Bear (Best Film)',
    eventId: 'ev0000091',
    categoryMatchers: ['best film'],
    excludeCategoryMatchers: ['short'],
    mediaType: 'movie',
  },
  {
    subtype: 'bafta_awards_best_film_winners',
    label: 'BAFTA Awards - Best Film',
    eventId: 'ev0000123',
    categoryMatchers: ['best film'],
    excludeCategoryMatchers: ['short'],
    mediaType: 'movie',
  },
  {
    subtype: 'critics_choice_awards_best_picture_winners',
    label: 'Critics Choice Awards - Best Picture',
    eventId: 'ev0000133',
    categoryMatchers: ['best picture'],
    mediaType: 'movie',
  },
  {
    subtype: 'cannes_film_festival_palme_dor_winners',
    label: "Cannes Film Festival - Palme d'Or",
    eventId: 'ev0000147',
    categoryMatchers: ["palme d'or"],
    mediaType: 'movie',
  },
  {
    subtype: 'cesar_awards_best_film_winners',
    label: 'Cesar Awards - Best Film',
    eventId: 'ev0000157',
    categoryMatchers: ['best film'],
    excludeCategoryMatchers: ['short'],
    mediaType: 'movie',
  },
  {
    subtype: 'primetime_emmy_awards_top_series_winners',
    label: 'Primetime Emmy Awards - Top Series Winners',
    eventId: 'ev0000223',
    categoryMatchers: [
      'outstanding drama series',
      'outstanding comedy series',
      'outstanding limited or anthology series',
      'outstanding limited series',
      'outstanding television movie',
    ],
    mediaType: 'tv',
    description: 'Drama, comedy, limited series, and television movie winners',
  },
  {
    subtype: 'filmfare_awards_best_film_winners',
    label: 'Filmfare Awards - Best Film',
    eventId: 'ev0000245',
    categoryMatchers: ['best film', 'best film - critics'],
    mediaType: 'movie',
  },
  {
    subtype: 'german_film_awards_best_feature_winners',
    label: 'German Film Awards - Outstanding Feature Film',
    eventId: 'ev0000280',
    categoryMatchers: ['outstanding feature film'],
    mediaType: 'movie',
  },
  {
    subtype: 'golden_globes_best_motion_picture_winners',
    label: 'Golden Globes - Best Motion Picture Winners',
    eventId: 'ev0000292',
    categoryMatchers: [
      'best motion picture - drama',
      'best motion picture - musical or comedy',
      'best motion picture - comedy or musical',
      'best motion picture - comedy/musical',
      'best motion picture - animated',
    ],
    mediaType: 'movie',
    description: 'Drama, comedy/musical, and animated motion picture winners',
  },
  {
    subtype: 'film_independent_spirit_awards_best_feature_winners',
    label: 'Film Independent Spirit Awards - Best Feature',
    eventId: 'ev0000349',
    categoryMatchers: ['best feature'],
    mediaType: 'movie',
  },
  {
    subtype: 'iifa_awards_best_picture_winners',
    label: 'IIFA Awards - Best Picture',
    eventId: 'ev0000361',
    categoryMatchers: ['best picture', 'best film'],
    mediaType: 'movie',
  },
  {
    subtype: 'zee_cine_awards_best_film_winners',
    label: 'Zee Cine Awards - Best Film',
    eventId: 'ev0000415',
    categoryMatchers: ['best film'],
    excludeCategoryMatchers: ['writing'],
    mediaType: 'movie',
  },
  {
    subtype: 'national_film_awards_india_best_feature_winners',
    label: 'National Film Awards (India) - Best Feature Film',
    eventId: 'ev0000467',
    categoryMatchers: ['best feature film'],
    mediaType: 'movie',
  },
  {
    subtype: 'national_film_preservation_board_registry_films',
    label: 'National Film Registry Additions',
    eventId: 'ev0000468',
    categoryMatchers: ['national film preservation board'],
    mediaType: 'movie',
  },
  {
    subtype: 'peoples_choice_awards_favorite_movie_winners',
    label: "People's Choice Awards - Favorite Movie",
    eventId: 'ev0000530',
    categoryMatchers: ['favorite movie', 'favorite motion picture'],
    excludeCategoryMatchers: ['actor', 'actress', 'duo'],
    mediaType: 'movie',
  },
  {
    subtype: 'razzie_awards_worst_picture_winners',
    label: 'Razzie Awards - Worst Picture',
    eventId: 'ev0000558',
    categoryMatchers: ['worst picture'],
    mediaType: 'movie',
  },
  {
    subtype: 'actors_awards_best_cast_winners',
    label: 'Screen Actors Guild Awards - Cast (Motion Picture)',
    eventId: 'ev0000598',
    categoryMatchers: [
      'outstanding performance by a cast in a motion picture',
    ],
    mediaType: 'movie',
  },
  {
    subtype: 'sundance_film_festival_grand_jury_dramatic_winners',
    label: 'Sundance Film Festival - Grand Jury Prize (Dramatic)',
    eventId: 'ev0000631',
    categoryMatchers: [
      'grand jury prize dramatic',
      'grand jury prize u s dramatic',
      'grand jury prize world cinema dramatic',
    ],
    mediaType: 'movie',
  },
  {
    subtype: 'toronto_international_film_festival_best_film_winners',
    label: "Toronto International Film Festival - People's Choice (Best Film)",
    eventId: 'ev0000659',
    categoryMatchers: [
      "people's choice award best film",
      'peoples choice award best film',
    ],
    mediaType: 'movie',
  },
  {
    subtype: 'venice_film_festival_best_film_winners',
    label: 'Venice Film Festival - Golden Lion (Best Film)',
    eventId: 'ev0000681',
    categoryMatchers: ['golden lion best film'],
    mediaType: 'movie',
  },
  {
    subtype: 'indian_television_academy_awards_best_serial_winners',
    label: 'Indian Television Academy Awards - Best Serial',
    eventId: 'ev0001931',
    categoryMatchers: ['best serial - drama', 'best serial - popular'],
    mediaType: 'tv',
  },
  {
    subtype: 'zee_rishtey_awards_best_show_winners',
    label: 'Zee Rishtey Awards - Best Show',
    eventId: 'ev0005699',
    categoryMatchers: ['best show', 'favorite show', 'favorite dharavaahik'],
    mediaType: 'tv',
  },
  {
    subtype: 'nickelodeon_kids_choice_awards_india_favorite_movie_winners',
    label: "Nickelodeon Kids' Choice Awards India - Favorite Movie",
    eventId: 'ev0005770',
    categoryMatchers: ['favorite movie'],
    mediaType: 'movie',
  },
  {
    subtype: 'indian_film_festival_of_melbourne_best_film_winners',
    label: 'Indian Film Festival of Melbourne - Best Film',
    eventId: 'ev0011808',
    categoryMatchers: ['best film'],
    mediaType: 'movie',
  },
  {
    subtype: 'filmfare_ott_awards_best_film_winners',
    label: 'Filmfare OTT Awards - Best Film',
    eventId: 'ev0035513',
    categoryMatchers: ['best film, web original', 'best film'],
    mediaType: 'movie',
  },
  {
    subtype: 'critics_choice_shorts_and_series_awards_best_series_winners',
    label: 'Critics Choice Shorts and Series Awards - Best Series',
    eventId: 'ev0036701',
    categoryMatchers: ['best series', 'best film fiction', 'best short film'],
    mediaType: 'tv',
  },
  {
    subtype: 'iconic_gold_awards_best_film_winners',
    label: 'Iconic Gold Awards - Best Film',
    eventId: 'ev0057191',
    categoryMatchers: ['best film'],
    mediaType: 'movie',
  },
  {
    subtype: 'bollywood_film_journalist_awards_best_film_winners',
    label: 'Bollywood Film Journalist Awards - Best Film',
    eventId: 'ev0060658',
    categoryMatchers: ['best film'],
    mediaType: 'movie',
  },
  {
    subtype: 'international_iconic_awards_best_film_winners',
    label: 'International Iconic Awards - Best Film',
    eventId: 'ev0073358',
    categoryMatchers: ['best film'],
    mediaType: 'movie',
  },
];

export const AWARD_SUBTYPE_CONFIGS: Record<
  string,
  AwardSubtypeDefinition
> = {};

for (const definition of AWARD_SUBTYPE_DEFINITIONS) {
  AWARD_SUBTYPE_CONFIGS[definition.subtype] = definition;
}
