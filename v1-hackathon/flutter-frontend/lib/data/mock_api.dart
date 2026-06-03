import 'dart:math';
import 'dart:ui';

import '../models/category_model.dart';
import '../models/show_model.dart';
import '../theme/app_colors.dart';

// --------------- Configurable constants ---------------
const int kCategoryCount = 9;
const int kShowsPerCategory = 50;
const int kInitialVisibleShows = 20;
const int kMaxOnScreen = 10; // max show cards visible on screen at once
const double kWorldW = 1400.0;
const double kWorldH = 1800.0;
const double kCategorySubregionRadius = 450.0;

// Show size thresholds (index-based within Fibonacci spiral)
const int kLargeCutoff = 4;   // 0–3 → Large (90px)
const int kMediumCutoff = 10; // 4–9 → Medium (70px)
const int kSmallCutoff = 20;  // 10–19 → Small (50px)
// 20+ → Extra Small (36px)

/// Hand-picked category positions (normalized 0–1, scaled to world)
const _categoryPositions = [
  (0.50, 0.28), // Drama — upper center
  (0.20, 0.15), // Sci-Fi — top left
  (0.80, 0.18), // Comedy — top right
  (0.15, 0.50), // Thriller — mid left
  (0.85, 0.50), // Romance — mid right
  (0.25, 0.78), // Horror — lower left
  (0.50, 0.65), // Action — center-lower
  (0.75, 0.80), // Documentary — lower right
  (0.50, 0.92), // Animation — bottom center
];

/// Simulates a backend call to fetch top categories for the user.
Future<List<Category>> fetchCategories() async {
  await Future.delayed(const Duration(milliseconds: 300));

  const categoryDefs = [
    ('drama', 'Drama', AppColors.drama),
    ('sciFi', 'Sci-Fi', AppColors.sciFi),
    ('comedy', 'Comedy', AppColors.comedy),
    ('thriller', 'Thriller', AppColors.thriller),
    ('romance', 'Romance', AppColors.romance),
    ('horror', 'Horror', AppColors.horror),
    ('action', 'Action', AppColors.action),
    ('documentary', 'Documentary', AppColors.documentary),
    ('animation', 'Animation', AppColors.animation),
  ];

  final categories = <Category>[];
  for (var i = 0; i < categoryDefs.length; i++) {
    final (key, label, color) = categoryDefs[i];
    final (nx, ny) = _categoryPositions[i];
    final pos = Offset(nx * kWorldW - kWorldW / 2, ny * kWorldH - kWorldH / 2);

    categories.add(Category(
      key: key,
      label: label,
      accentColor: color,
      position: pos,
      radius: kCategorySubregionRadius,
    ));
  }

  return categories;
}

// --------------- Mock show titles per category ---------------
const _mockTitles = <String, List<String>>{
  'drama': [
    'Breaking Bad', 'The Crown', 'Succession', 'Better Call Saul', 'Ozark',
    'The Wire', 'Mad Men', 'The Sopranos', 'Downton Abbey', 'Fargo',
    'Peaky Blinders', 'The Handmaid\'s Tale', 'Big Little Lies', 'Chernobyl',
    'Mare of Easttown', 'The Leftovers', 'Rectify', 'Bloodline', 'Damages',
    'The Americans', 'Homeland', 'Billions', 'House of Cards', 'Bodyguard',
    'Broadchurch', 'Line of Duty', 'Happy Valley', 'The Night Manager',
    'Sharp Objects', 'True Detective', 'Mindhunter', 'Narcos', 'Godless',
    'Olive Kitteridge', 'Normal People', 'Fleabag', 'This Is Us',
    'Parenthood', 'Friday Night Lights', 'Six Feet Under', 'Transparent',
    'Pose', 'When They See Us', 'The Queen\'s Gambit', 'Maid',
    'Station Eleven', 'Severance', 'Pachinko', 'Beef', 'The Bear',
  ],
  'sciFi': [
    'Stranger Things', 'Black Mirror', 'Westworld', 'The Expanse', 'Dark',
    'Altered Carbon', 'Love Death Robots', 'Devs', 'Foundation', 'Severance',
    'Battlestar Galactica', 'Fringe', 'The 100', 'Orphan Black', 'Sense8',
    'The OA', 'Counterpart', 'Electric Dreams', 'Tales from the Loop',
    'Raised by Wolves', 'Invasion', 'For All Mankind', 'Silo', 'Beacon 23',
    'Lost in Space', 'Another Life', 'Away', 'Nightflyers', 'The Rain',
    'Between', '3 Body Problem', 'Humans', 'Almost Human', 'Dollhouse',
    'Firefly', 'Farscape', 'Stargate SG-1', 'Babylon 5', 'Andromeda',
    'Quantum Leap', 'Sliders', 'The Twilight Zone', 'Star Trek Discovery',
    'Star Trek Picard', 'Doctor Who', 'Torchwood', 'Red Dwarf',
    'Blake\'s 7', 'Space 1999', 'Moonhaven',
  ],
  'comedy': [
    'The Office', 'Parks and Recreation', 'Brooklyn Nine-Nine', 'Schitt\'s Creek',
    'Ted Lasso', 'Arrested Development', 'Community', 'It\'s Always Sunny',
    'Veep', 'Silicon Valley', 'Curb Your Enthusiasm', 'Seinfeld',
    'Friends', 'How I Met Your Mother', 'The Good Place', 'New Girl',
    'Unbreakable Kimmy Schmidt', 'Master of None', 'Atlanta', 'Louie',
    'Fleabag', 'What We Do in the Shadows', 'Ghosts', 'Abbott Elementary',
    'Hacks', 'Only Murders in the Building', 'The Bear', 'Reservation Dogs',
    'Derry Girls', 'Letterkenny', 'Kim\'s Convenience', 'Superstore',
    'Scrubs', 'Malcolm in the Middle', 'Frasier', '30 Rock',
    'Broad City', 'Insecure', 'Ramy', 'Dave', 'PEN15',
    'Mythic Quest', 'Loot', 'Shrinking', 'The Afterparty',
    'Jury Duty', 'English Teacher', 'Nobody Wants This', 'Bad Sisters',
    'Starstruck',
  ],
  'thriller': [
    'Mr. Robot', 'Killing Eve', 'Money Heist', 'You', 'Mindhunter',
    'Hannibal', 'The Fall', 'Luther', 'Sherlock', 'Dexter',
    'Bates Motel', 'Ratched', 'The Sinner', 'Gone Girl', 'Ozark',
    'Jack Ryan', 'Reacher', 'The Terminal List', 'Slow Horses', 'Berlin',
    'Collateral', 'Safe', 'Behind Her Eyes', 'The Woman in the House',
    'Clickbait', 'The Watcher', 'The Night Agent', 'Kaleidoscope',
    'Griselda', 'Ripley', 'The Gentlemen', 'Fool Me Once',
    'The Recruit', 'Citadel', 'Special Ops', 'Sacred Games',
    'Paatal Lok', 'Breathe', 'Criminal Justice', 'Undekhi',
    'Asur', 'Hostages', 'Aarya', 'Scam 1992', 'Mirzapur',
    'The Family Man', 'Rocket Boys', 'Delhi Crime', 'IC 814',
    'Black Warrant',
  ],
  'romance': [
    'Bridgerton', 'Normal People', 'Heartstopper', 'Emily in Paris',
    'Virgin River', 'Outlander', 'Daisy Jones & The Six', 'One Day',
    'The Notebook', 'Pride and Prejudice', 'Jane Eyre', 'North and South',
    'Poldark', 'Sanditon', 'Anne with an E', 'Little Women',
    'Love', 'You', 'Lovesick', 'Crash Landing on You',
    'Goblin', 'Descendants of the Sun', 'Boys Over Flowers', 'True Beauty',
    'Business Proposal', 'Hometown Cha-Cha-Cha', 'Reply 1988',
    'My Love from the Star', 'It\'s Okay to Not Be Okay', 'Vincenzo',
    'Sweet Home', 'All of Us Are Dead', 'Squid Game', 'The Glory',
    'XO Kitty', 'To All the Boys', 'The Summer I Turned Pretty',
    'Firefly Lane', 'Sweet Magnolias', 'Hart of Dixie',
    'Gilmore Girls', 'Dawson\'s Creek', 'One Tree Hill', 'Gossip Girl',
    'The O.C.', 'Felicity', 'Everwood', 'Jack & Bobby',
    'Tell Me Lies', 'Nobody Wants This',
  ],
  'horror': [
    'The Haunting of Hill House', 'Midnight Mass', 'The Fall of the House of Usher',
    'American Horror Story', 'The Walking Dead', 'Penny Dreadful',
    'Bates Motel', 'Castle Rock', 'Lovecraft Country', 'Them',
    'Brand New Cherry Flavor', 'Archive 81', 'Marianne', 'The Terror',
    'Channel Zero', 'Slasher', 'Scream Queens', 'Ash vs Evil Dead',
    'From', 'Yellowjackets', 'Servant', 'Chucky', 'Creepshow',
    'What We Do in the Shadows', 'Wellington Paranormal', 'Ghosts',
    'The Strain', 'Salem', 'Dracula', 'Interview with the Vampire',
    'Let the Right One In', 'Guillermo del Toro\'s Cabinet', 'Hellbound',
    'All of Us Are Dead', 'Sweet Home', 'Kingdom', 'Parasyte',
    'Ju-On Origins', 'Betaal', 'Ghoul', 'Typewriter', 'Bulbbul',
    'Tumbbad', 'Pari', 'Stree', 'Roohi', 'Bhool Bhulaiyaa',
    'The Exorcist', 'Evil', 'Chapelwaite', 'Midnight Mass',
  ],
  'action': [
    'Game of Thrones', 'House of the Dragon', 'The Witcher', 'Vikings',
    'Spartacus', 'Banshee', 'Strike Back', '24', 'Prison Break',
    'The Punisher', 'Daredevil', 'Arrow', 'The Boys', 'Invincible',
    'Gangs of London', 'Warrior', 'Into the Badlands', 'Marco Polo',
    'The Last Kingdom', 'Knightfall', 'Norsemen', 'Barbarians',
    'The Mandalorian', 'Andor', 'Ahsoka', 'Obi-Wan Kenobi',
    'Loki', 'Falcon and Winter Soldier', 'Hawkeye', 'Moon Knight',
    'Extraction', 'Old Guard', 'Red Notice', 'Gray Man',
    'Jack Reacher', 'John Wick', 'Mission Impossible', 'Fast X',
    'Top Gun Maverick', 'Mad Max Fury Road', 'Gladiator', 'Troy',
    'Braveheart', '300', 'Kingdom of Heaven', 'Robin Hood',
    'The Equalizer', 'Taken', 'Die Hard', 'Lethal Weapon',
  ],
  'documentary': [
    'Planet Earth', 'Our Planet', 'Blue Planet', 'Cosmos',
    'Making a Murderer', 'The Jinx', 'Wild Wild Country', 'Tiger King',
    'The Tinder Swindler', 'Don\'t F with Cats', 'The Staircase',
    'Evil Genius', 'Abducted in Plain Sight', 'Fyre Festival',
    'Icarus', 'Free Solo', 'My Octopus Teacher', 'The Social Dilemma',
    'Seaspiracy', 'Cowspiracy', 'What the Health', 'Game Changers',
    'The Last Dance', 'Formula 1 Drive to Survive', 'Sunderland \'Til I Die',
    'All or Nothing', 'Welcome to Wrexham', 'Break Point',
    'Chef\'s Table', 'Street Food', 'Ugly Delicious', 'Salt Fat Acid Heat',
    'Abstract', 'Inside Bill\'s Brain', 'The Playbook', 'Losers',
    'American Factory', 'The White Helmets', '13th', 'Blackfish',
    'Won\'t You Be My Neighbor', 'RBG', 'Apollo 11', 'Jiro Dreams of Sushi',
    'Exit Through the Gift Shop', 'Man on Wire', 'Amy', 'Senna',
    'The Act of Killing', 'Grizzly Man',
  ],
  'animation': [
    'Arcane', 'Invincible', 'Attack on Titan', 'Demon Slayer',
    'Jujutsu Kaisen', 'My Hero Academia', 'One Piece', 'Naruto',
    'Death Note', 'Fullmetal Alchemist', 'Hunter x Hunter', 'One Punch Man',
    'Mob Psycho 100', 'Spy x Family', 'Chainsaw Man', 'Vinland Saga',
    'Made in Abyss', 'The Promised Neverland', 'Erased', 'Steins Gate',
    'Cowboy Bebop', 'Samurai Champloo', 'Neon Genesis Evangelion',
    'Ghost in the Shell', 'Akira', 'Spirited Away', 'Princess Mononoke',
    'Your Name', 'A Silent Voice', 'Weathering with You',
    'Rick and Morty', 'Bojack Horseman', 'Futurama', 'The Simpsons',
    'South Park', 'Family Guy', 'Bob\'s Burgers', 'Big Mouth',
    'Castlevania', 'Primal', 'Samurai Jack', 'Avatar The Last Airbender',
    'The Legend of Korra', 'Gravity Falls', 'Adventure Time',
    'Steven Universe', 'Over the Garden Wall', 'Hilda',
    'Blue Eye Samurai', 'Scavengers Reign',
  ],
};

/// Simulates a backend call to fetch shows for a given category.
Future<List<Show>> fetchShowsByCategory(String categoryKey) async {
  await Future.delayed(const Duration(milliseconds: 200));

  final titles = _mockTitles[categoryKey] ?? [];
  final rng = Random(categoryKey.hashCode); // deterministic per category
  final count = min(kShowsPerCategory, titles.length);
  // Golden angle for Fibonacci sunflower pattern
  final goldenAngle = pi * (3 - sqrt(5));

  return List.generate(count, (i) {
    // Fibonacci sunflower: uniform spacing, center = most important
    final angle = i * goldenAngle;
    final radius = sqrt(i / count) * kCategorySubregionRadius;
    final rx = cos(angle) * radius;
    final ry = sin(angle) * radius;

    // Size tier based on spiral index (center = large, outer = XS)
    ShowSize tier;
    if (i < kLargeCutoff) {
      tier = ShowSize.large;
    } else if (i < kMediumCutoff) {
      tier = ShowSize.medium;
    } else if (i < kSmallCutoff) {
      tier = ShowSize.small;
    } else {
      tier = ShowSize.extraSmall;
    }

    return Show(
      id: '${categoryKey}_$i',
      title: titles[i],
      posterUrl: 'https://static.tvmaze.com/uploads/images/medium_portrait/${100 + rng.nextInt(300)}/${rng.nextInt(999999)}.jpg',
      genres: [categoryKey],
      categoryKey: categoryKey,
      year: 2005 + rng.nextInt(21),
      rating: 6.0 + rng.nextDouble() * 3.5,
      language: rng.nextDouble() > 0.85 ? 'Korean' : 'English',
      description: '${titles[i]} — a gripping ${categoryKey} experience.',
      actors: const [],
      tags: const [],
      relativeX: rx,
      relativeY: ry,
      matchPercent: 40 + rng.nextInt(55),
      sizeTier: tier,
    );
  });
}
