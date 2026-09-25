import * as THREE from 'three';
import { groundHeightAt, TERRAIN } from './terrain.js';
import { ENTRANCE } from './entrance.js';
import { GURUKUL } from './gurukul.js';
import { playQuestComplete, playYatraComplete, startHelicopterLoop } from './audio.js';

const STORAGE_KEY = 'mayapur-gifts-v2';
const GIFT_TOTAL = 11;
const TOTAL_LEVELS = 5;
const OPEN_RADIUS = 12;

const RIVER = { z: -355, halfWidth: 125, y: -3.42 };

export const QUESTIONS_BY_LEVEL = [
  // --- LEVEL 1: Foundations of Sri Mayapur Dham & Bhakti ---
  [
    {
      question: 'Who is the founder-acharya of the International Society for Krishna Consciousness (ISKCON)?',
      options: [
        'Srila Bhaktivinoda Thakura',
        'Srila A. C. Bhaktivedanta Swami Prabhupada',
        'Srila Narottama Dasa Thakura',
      ],
      answer: 1,
    },
    {
      question: 'Which sacred river flows beside Mayapur?',
      options: ['Yamuna', 'Ganga', 'Saraswati'],
      answer: 1,
    },
    {
      question: 'Who appeared in Mayapur in the year 1486 as the Golden Avatar of Divine Love?',
      options: ['Sri Chaitanya Mahaprabhu', 'Lord Rama', 'Lord Shiva'],
      answer: 0,
    },
    {
      question: 'What is the Hare Krishna Maha-Mantra?',
      options: [
        'Om Namah Shivaya',
        'Gayatri Mantra',
        'Hare Krishna Hare Krishna, Krishna Krishna Hare Hare…',
      ],
      answer: 2,
    },
    {
      question: 'What does "prasadam" mean?',
      options: [
        'A sacred temple bell',
        'Sanctified food offered to the Lord with love',
        'A pilgrim\'s walking stick',
      ],
      answer: 1,
    },
    {
      question: 'What is "parikrama"?',
      options: [
        'Circumambulating a sacred temple or holy place',
        'A festival of fireworks',
        'A morning bath in the holy river',
      ],
      answer: 0,
    },
    {
      question: 'Which deity is worshipped on the sanctum altar of the Mayapur temple for supreme protection?',
      options: ['Lord Ganesha', 'Lord Narsimhadeva', 'Lord Hanuman'],
      answer: 1,
    },
    {
      question: 'What is "sankirtana"?',
      options: [
        'Congregational chanting and singing of the Lord\'s holy names',
        'A silent forest retreat',
        'A formal fire sacrifice',
      ],
      answer: 0,
    },
    {
      question: 'What does "darshan" signify in Vaishnava culture?',
      options: [
        'Offering a donation',
        'A boat pilgrimage across rivers',
        'Beholding the deity with love and receiving the Lord\'s merciful glance',
      ],
      answer: 2,
    },
    {
      question: 'What is the essence of "bhakti"?',
      options: [
        'Selfless loving devotional service to the Supreme Lord',
        'Dry philosophical debate',
        'Rigid bodily penance',
      ],
      answer: 0,
    },
    {
      question: 'What is the name of Mayapur\'s grand temple under construction?',
      options: [
        'Somnath Mandir',
        'Temple of the Vedic Planetarium (TOVP)',
        'Akshardham Mandir',
      ],
      answer: 1,
    },
  ],

  // --- LEVEL 2: Navadvipa Dham & The Holy Procession ---
  [
    {
      question: 'In which year did Srila Prabhupada lay the foundation stone of ISKCON Mayapur?',
      options: ['1972', '1955', '1989'],
      answer: 0,
    },
    {
      question: 'What festival commemorates Lord Jagannatha\'s glorious chariot procession?',
      options: ['Janmashtami', 'Ratha Yatra', 'Radhashtami'],
      answer: 1,
    },
    {
      question: 'How many sacred islands make up the holy district of Navadvipa?',
      options: ['Nine islands', 'Seven islands', 'Twelve islands'],
      answer: 0,
    },
    {
      question: 'Which island of Navadvipa represents "Atma-nivedanam" (complete self-surrender)?',
      options: ['Godrumadvipa', 'Simantadvipa', 'Antardvipa (Mayapur)'],
      answer: 2,
    },
    {
      question: 'What are the two traditional instruments used to accompany Gaudiya kirtan?',
      options: ['Mridanga and Karatalas', 'Tabla and Harmonium', 'Flute and Veena'],
      answer: 0,
    },
    {
      question: 'Who is Prahlada Maharaja, seated peacefully near Lord Narsimhadeva?',
      options: [
        'A celestial musician',
        'The great child devotee whose pure devotion invoked Lord Narsimhadeva',
        'A king of ancient Mithila',
      ],
      answer: 1,
    },
    {
      question: 'What sacred plant is revered as an eternal devotee of Krishna and worshipped daily with water and lamps?',
      options: ['Neem tree', 'Banyan tree', 'Tulasi Devi'],
      answer: 2,
    },
    {
      question: 'How many beads are on a traditional Vaishnava Japa mala used for chanting the Maha-Mantra?',
      options: ['108 beads', '54 beads', '100 beads'],
      answer: 0,
    },
    {
      question: 'Who are the central deities worshipped with eight sakhis (gopis) on the main altar of Mayapur?',
      options: ['Sita Rama Lakshmana', 'Sri Sri Radha Madhava', 'Lakshmi Narayana'],
      answer: 1,
    },
    {
      question: 'What sacred place in Mayapur marks the exact appearance place of Sri Chaitanya Mahaprabhu?',
      options: ['Yoga Pitha', 'Srivas Angan', 'Chand Kazi Samadhi'],
      answer: 0,
    },
    {
      question: 'What divine manifestation represents the five features of the Supreme Lord appearing together in Gaudiya Vaishnavism?',
      options: ['Dashavatara', 'Nava Durga', 'Pancha Tattva'],
      answer: 2,
    },
  ],

  // --- LEVEL 3: Teachings of Sri Chaitanya & Bhagavad-gita ---
  [
    {
      question: 'Which eight verses were the only written teachings composed directly by Sri Chaitanya Mahaprabhu?',
      options: ['Sri Shikshashtakam', 'Gita Govinda', 'Brahma Samhita'],
      answer: 0,
    },
    {
      question: 'According to the first verse of Shikshashtakam, what does chanting the Holy Names cleanse?',
      options: [
        'Only the physical body',
        'Ceto-darpana-marjanam (the dust from the mirror of the heart)',
        'The atmosphere of the city',
      ],
      answer: 1,
    },
    {
      question: 'Who wrote Sri Chaitanya Charitamrita, the profound biographical scripture of Mahaprabhu\'s life?',
      options: [
        'Srila Vyasadeva',
        'Srila Valmiki',
        'Srila Krishnadasa Kaviraja Goswami',
      ],
      answer: 2,
    },
    {
      question: 'Who were the two saintly brothers who gave up high minister posts to serve Mahaprabhu in Vrindavana?',
      options: ['Rupa Goswami and Sanatana Goswami', 'Brahma and Shiva', 'Haridasa and Advaita'],
      answer: 0,
    },
    {
      question: 'In Bhagavad-gita 18.66, what does Lord Krishna instruct Arjuna as the ultimate conclusion?',
      options: [
        'Perform severe forest penances',
        'Abandon all varieties of religion and surrender unto Me alone',
        'Study all Vedic rites and rituals',
      ],
      answer: 1,
    },
    {
      question: 'What did Sri Chaitanya Mahaprabhu reveal is the constitutional nature of every soul (jiva)?',
      options: [
        'To merge into voidness',
        'To become master of the material realm',
        'Jivera svarupa haya nitya-krishna-dasa (eternal servant of Krishna)',
      ],
      answer: 2,
    },
    {
      question: 'Who is revered as the "Namacharya" for chanting 300,000 holy names daily with unbreakable devotion?',
      options: ['Srila Haridasa Thakura', 'Srila Ramananda Raya', 'Srila Srivasa Pandita'],
      answer: 0,
    },
    {
      question: 'What divine mood does Sri Chaitanya Mahaprabhu embody in His pastimes?',
      options: [
        'The mood of a conquering monarch',
        'The mood of Srimati Radharani searching for Krishna',
        'The mood of an impassive philosopher',
      ],
      answer: 1,
    },
    {
      question: 'What is the sacred compound in Mayapur where Mahaprabhu held ecstatic all-night kirtans with His devotees?',
      options: ['Ghat of Kazi', 'Hulor Ghat', 'Srivas Angan'],
      answer: 2,
    },
    {
      question: 'In the Bhagavad-gita, what are the three modes of material nature called?',
      options: [
        'Gunas (Sattva, Rajas, Tamas)',
        'Doshas (Vata, Pitta, Kapha)',
        'Chakras (Muladhara, Anahata, Ajna)',
      ],
      answer: 0,
    },
    {
      question: 'What is the highest stage of bhakti, described as ecstatic, unalloyed pure love of Godhead?',
      options: ['Shraddha', 'Prema', 'Nishtha'],
      answer: 1,
    },
  ],

  // --- LEVEL 4: Vedic Planetarium, Science & Sacred Culture ---
  [
    {
      question: 'What did Srila Prabhupada intend the Temple of the Vedic Planetarium to display?',
      options: [
        'Modern industrial engines',
        'Vedic cosmology as described in Srimad-Bhagavatam',
        'Historical archaeological fossils',
      ],
      answer: 1,
    },
    {
      question: 'Why did Lord Chaitanya dance with intense longing in front of Lord Jagannatha\'s cart?',
      options: [
        'To invite Lord Jagannatha back to Vrindavana from Kurukshetra',
        'To win praise from the royal court',
        'To demonstrate gymnastic agility',
      ],
      answer: 0,
    },
    {
      question: 'Which 19th-century Vaishnava visionary rediscovered Mahaprabhu\'s birthplace and envisioned the TOVP?',
      options: ['Raja Ram Mohan Roy', 'Srila Jiva Goswami', 'Srila Bhaktivinoda Thakura'],
      answer: 2,
    },
    {
      question: 'Why is bathing in the holy Ganga spiritually liberating according to Vedic wisdom?',
      options: [
        'The Ganga originates from the lotus feet of Lord Vishnu',
        'It is the longest river in the subcontinent',
        'It carries cool mountain snowmelt',
      ],
      answer: 0,
    },
    {
      question: 'What is the sacred practice of fasting from grains and beans twice a month called?',
      options: ['Purnima', 'Ekadashi', 'Amavasya'],
      answer: 1,
    },
    {
      question: 'What four pillars of dharma are safeguarded by the four regulative principles?',
      options: [
        'Fame, Wealth, Power, and Beauty',
        'Grammar, Logic, Poetry, and Drama',
        'Compassion, Truthfulness, Cleanliness, and Austerity',
      ],
      answer: 2,
    },
    {
      question: 'Why is cow protection (Go-raksha) an essential pillar of life in Mayapur\'s goshala?',
      options: [
        'The cow is dear to Lord Krishna (Gopala) and regarded as a gentle mother',
        'For export commerce',
        'For plowing competitions',
      ],
      answer: 0,
    },
    {
      question: 'What spiritual attitude is praised in the famous verse "trinad api sunichena"?',
      options: [
        'Singing in elaborate musical ragas',
        'Being more humble than a blade of grass and tolerant like a tree',
        'Wearing luxurious royal ornaments',
      ],
      answer: 1,
    },
    {
      question: 'In Sri Upadeshamrita, how many loving exchanges (sad-vidha priti-laksanam) strengthen bonds between devotees?',
      options: [
        'Three exchanges',
        'Twelve exchanges',
        'Six loving exchanges (giving/receiving gifts, sharing food, revealing one\'s mind)',
      ],
      answer: 2,
    },
    {
      question: 'Which sacred text by Srila Vrindavana Dasa Thakura describes the golden childhood of Nimai in Mayapur?',
      options: ['Sri Chaitanya Bhagavata', 'Mahabharata', 'Vishnu Purana'],
      answer: 0,
    },
    {
      question: 'What grand cosmological centerpiece will be suspended inside the central dome of the TOVP?',
      options: [
        'A clock pendulum',
        'A rotating 3D chandelier model of the universal planetary systems',
        'A stone obelisk',
      ],
      answer: 1,
    },
  ],

  // --- LEVEL 5: Ultimate Realization, Acintya & Eternal Dhama ---
  [
    {
      question: 'What core philosophical conclusion taught by Sri Chaitanya Mahaprabhu reconciles oneness and difference?',
      options: [
        'Advaita Mayavada (absolute impersonal oneness)',
        'Nihilism (voidness)',
        'Acintya-bhedabheda-tattva (inconceivable simultaneous oneness and difference)',
      ],
      answer: 2,
    },
    {
      question: 'How did Srila Prabhupada explain devotees can always associate with him eternally?',
      options: [
        'Through his books, his instructions (vani), and chanting Hare Krishna',
        'Only by visiting his birthplace in Kolkata',
        'Only through mystical visions',
      ],
      answer: 0,
    },
    {
      question: 'Who is Lord Jagannatha, whose large round eyes gaze with infinite mercy?',
      options: [
        'An ancient King of Kalinga',
        'Lord Krishna in the mood of transcendental longing for Vrindavana',
        'A Vedic demigod of rain',
      ],
      answer: 1,
    },
    {
      question: 'What is the transcendental status of Sri Navadvipa Dham in Vaishnava theology?',
      options: [
        'An ordinary historical town',
        'A metaphorical legend',
        'Non-different from Goloka Vrindavana, eternally existing in the spiritual sky',
      ],
      answer: 2,
    },
    {
      question: 'What is the fruit of chanting the Maha-Mantra without offenses (shuddha-nama)?',
      options: [
        'It awakens dormant pure love of Godhead (Krishna-prema) in the soul',
        'It grants worldly political influence',
        'It enables physical levitation',
      ],
      answer: 0,
    },
    {
      question: 'What sublime gift did Lord Chaitanya distribute unconditionally to all living beings?',
      options: [
        'Silver and gold coins',
        'The priceless treasure of Krishna-prema (pure divine love)',
        'Scholarly degrees in logic',
      ],
      answer: 1,
    },
    {
      question: 'Which foundational scripture composed by Srila Rupa Goswami is known as "The Nectar of Devotion"?',
      options: ['Bhakti-rasamrita-sindhu', 'Hari-bhakti-vilasa', 'Vidagdha-madhava'],
      answer: 0,
    },
    {
      question: 'In Sri Godrumadvipa, what traveling outreach program did Srila Bhaktivinoda Thakura establish?',
      options: [
        'Dharma-Sabha',
        'Veda-Pathashala',
        'Nama-hatta (the marketplace of the Holy Name)',
      ],
      answer: 2,
    },
    {
      question: 'What does "Saranagati", the revered songbook by Bhaktivinoda Thakura, teach?',
      options: [
        'The six limbs of unreserved surrender to Sri Krishna',
        'Astrological charts for travel',
        'Techniques for temple masonry',
      ],
      answer: 0,
    },
    {
      question: 'What eternal relationship does the liberated soul realize in the transcendental realm?',
      options: [
        'Merging into unconscious light',
        'An eternal rasa of loving service (servitude, friendship, parental love, or conjugal love) with Krishna',
        'Becoming sovereign ruler of galaxies',
      ],
      answer: 1,
    },
    {
      question: 'What prophetic promise did Sri Chaitanya Mahaprabhu declare for the Holy Names?',
      options: [
        'Chanting would cease after a few centuries',
        'Chanting would remain confined to Navadvipa',
        '"Prithivite ache yata nagaradi grama, sarvatra pracara haibe mora nama" (My name will be chanted in every town and village of the earth)',
      ],
      answer: 2,
    },
  ],
];

const DROP_ZONES = [
  { x: 330, z: -300, label: 'the city by the Ganga' },
  { x: -330, z: 270, label: 'the western fields near the goshala' },
  { x: -320, z: -430, label: 'the far northern riverbank' },
  { x: -120, z: 420, label: 'the open plains beyond the temple' },
  { x: 540, z: 40, label: 'the grand eastern city square' },
];

function buildLevelConfigs(villagePoints, farmPoints, temple) {
  const village = (index, dx, dz) => {
    const p = villagePoints[index] || { x: 120, z: 0 };
    return { x: p.x + dx, z: p.z + dz };
  };
  const farm = (index, dx, dz) => {
    const p = farmPoints[index] || { x: -130, z: 0 };
    return { x: p.x + dx, z: p.z + dz };
  };

  const templeCenter = {
    x: (temple.minX + temple.maxX) / 2,
    z: (temple.minZ + temple.maxZ) / 2,
  };

  return [
    // --- LEVEL 1: The Sacred Dhama Tour ---
    {
      level: 1,
      name: 'The Sacred Dhama Tour',
      blessingText: 'You found all 11 gifts hidden across Mayapur Dham in Level 1! Sri Sri Radha Madhava and Lord Narsimhadeva bless your spiritual journey. Advance to Level 2 for new hidden treasures!',
      dropZone: DROP_ZONES[0],
      questions: QUESTIONS_BY_LEVEL[0],
      spots: [
        { id: 'l1-temple-roof', x: temple.maxX - 4, z: temple.minZ + 10, y: temple.maxY + 2.5, first: true },
        { id: 'l1-temple-back', x: templeCenter.x, z: temple.minZ - 8, lift: 1 },
        { id: 'l1-gurukul-back', x: GURUKUL.x - 40, z: GURUKUL.z - 18, lift: 1 },
        {
          id: 'l1-ganga-middle',
          x: -120,
          z: RIVER.z,
          y: RIVER.y + 1.0,
          boatOnly: true,
        },
        {
          id: 'l1-ganga-boat',
          mount: 'ganga-cruise-ship',
          mountOffset: { x: 0, y: 92.2, z: 0 },
          fallback: { x: -120, z: RIVER.z, y: RIVER.y + 1.0 },
        },
        { id: 'l1-ghat-water', x: -402, z: -232, y: RIVER.y + 1.4 },
        { ...village(3, 7, -6), id: 'l1-village-east', lift: 0.9 },
        { ...village(0, 6, 6), id: 'l1-village-south', lift: 0.9 },
        { ...farm(4, 8, 8), id: 'l1-farm-field', lift: 1 },
        { id: 'l1-hillside-grass', x: 2.3 - 28, z: 32 - 22, lift: 0.9 },
      ],
    },

    // --- LEVEL 2: Processions & Holy Names ---
    {
      level: 2,
      name: 'Processions & Holy Names',
      blessingText: 'Glorious! You accompanied the sacred Rath Yatra and Srila Prabhupada to find all 11 gifts in Level 2! Advance to Level 3 to seek gifts in celestial heights and upper temple balconies!',
      dropZone: DROP_ZONES[1],
      questions: QUESTIONS_BY_LEVEL[1],
      spots: [
        {
          id: 'l2-prabhupada',
          mount: 'avatar',
          mountOffset: { x: 0.75, y: 1.25, z: 0.25 },
          fallback: { x: ENTRANCE.doorX, y: 18, z: 120 },
        },
        {
          id: 'l2-ratha-cart',
          mount: 'terrain-orbit',
          mountOffset: { x: 0, y: 14.5, z: 0 },
          fallback: { x: -60, y: 18, z: 135 },
        },
        {
          id: 'l2-temple-dome-pinnacle',
          x: templeCenter.x,
          z: templeCenter.z,
          y: temple.maxY + 14,
        },
        { id: 'l2-ghat-canopy', x: -370, y: 16.5, z: -215 },
        {
          id: 'l2-kirtan-followers-ghat',
          mount: 'kirtan-followers-ghat',
          mountOffset: { x: 0, y: 4.2, z: 0 },
          fallback: { x: -385, z: -170, y: 5 },
        },
        { id: 'l2-wooden-boat', x: -280, y: RIVER.y + 1.2, z: RIVER.z + 25 },
        { id: 'l2-stair-fountain-left', x: 3.5, y: 18.5, z: 120 },
        { id: 'l2-gurukul-roof', x: GURUKUL.x + 22, y: 24, z: GURUKUL.z + 10 },
        { id: 'l2-village-banyan', x: 160, z: -35, lift: 1.2 },
        { ...farm(2, -12, 10), id: 'l2-farms-windmill', lift: 1.4 },
      ],
    },

    // --- LEVEL 3: Celestial Heights & Sky Balconies ---
    {
      level: 3,
      name: 'Celestial Heights & Sky Balconies',
      blessingText: 'Magnificent! You soared above Mayapur and found all 11 gifts in Level 3! Advance to Level 4 to discover sacred sanctums and fragrant village groves!',
      dropZone: DROP_ZONES[2],
      questions: QUESTIONS_BY_LEVEL[2],
      spots: [
        {
          id: 'l3-kirtan-village',
          mount: 'kirtan-followers-village',
          mountOffset: { x: 0, y: 4.2, z: 0 },
          fallback: { x: 128, z: -12, y: 6 },
        },
        { id: 'l3-temple-east-balcony', x: temple.maxX + 2, y: 56, z: templeCenter.z },
        { id: 'l3-temple-west-balcony', x: temple.minX - 2, y: 56, z: templeCenter.z },
        { id: 'l3-temple-flag', x: ENTRANCE.doorX, y: 46, z: 130 },
        { id: 'l3-city-tower', x: 380, y: 38, z: -240 },
        {
          id: 'l3-river-delta-buoy',
          x: -480,
          y: RIVER.y + 1.0,
          z: RIVER.z - 30,
          boatOnly: true,
        },
        { ...farm(1, 15, -15), id: 'l3-goshala-cows', lift: 1.1 },
        { id: 'l3-dancer-west-figure', x: 48, y: 14.5, z: 104 },
        { id: 'l3-ridge-overlook', x: 195, y: 28, z: 120 },
        { id: 'l3-city-archway', x: 245, y: 22, z: 0 },
      ],
    },

    // --- LEVEL 4: Hidden Sanctums & Sacred Groves ---
    {
      level: 4,
      name: 'Hidden Sanctums & Sacred Groves',
      blessingText: 'Incredible devotion! You uncovered all 11 gifts of Level 4 across the sacred shrines! Advance to Level 5 for the Grand Maha Parikrama!',
      dropZone: DROP_ZONES[3],
      questions: QUESTIONS_BY_LEVEL[3],
      spots: [
        {
          id: 'l4-prabhupada',
          mount: 'avatar',
          mountOffset: { x: -0.65, y: 1.25, z: -0.2 },
          fallback: { x: ENTRANCE.doorX, y: 39, z: 75 },
        },
        {
          id: 'l4-ratha-crest',
          mount: 'terrain-orbit',
          mountOffset: { x: 0, y: 7.5, z: 3.2 },
          fallback: { x: -60, y: 12, z: 135 },
        },
        { id: 'l4-temple-entrance-arch', x: ENTRANCE.doorX, y: 44.5, z: 82.5 },
        {
          id: 'l4-ganga-cruise-mast',
          mount: 'ganga-cruise-ship',
          mountOffset: { x: 16, y: 97, z: 0 },
          fallback: { x: -120, z: RIVER.z, y: 12 },
        },
        { id: 'l4-gurukul-chhatri', x: GURUKUL.x - 15, y: 32, z: GURUKUL.z + 18 },
        {
          id: 'l4-city-procession',
          mount: 'kirtan-followers-black-road-1',
          mountOffset: { x: 0, y: 4.2, z: 0 },
          fallback: { x: 245, z: 10, y: 4 },
        },
        { id: 'l4-ghat-boarding-boat', x: -360, y: RIVER.y + 1.2, z: RIVER.z + 65 },
        { ...village(1, -8, 12), id: 'l4-village-tulasi', lift: 1.0 },
        { ...farm(3, 14, 18), id: 'l4-farms-pond', lift: 1.0 },
        { id: 'l4-stair-fountain-right', x: 32, y: 18.5, z: 120 },
      ],
    },

    // --- LEVEL 5: The Maha Parikrama ---
    {
      level: 5,
      name: 'The Maha Parikrama',
      blessingText: 'Hare Krishna! You have discovered all 55 sacred gifts across all 5 levels of Sri Mayapur Dham! May the eternal mercy of Sri Chaitanya Mahaprabhu, Lord Narsimhadeva, and Srila Prabhupada shower upon you forever.',
      dropZone: DROP_ZONES[4],
      questions: QUESTIONS_BY_LEVEL[4],
      spots: [
        {
          id: 'l5-sudarshana-chakra',
          x: templeCenter.x,
          y: temple.maxY + 22,
          z: templeCenter.z,
        },
        {
          id: 'l5-prabhupada',
          mount: 'avatar',
          mountOffset: { x: 0, y: 1.8, z: 0 },
          fallback: { x: ENTRANCE.doorX, y: 25, z: 100 },
        },
        {
          id: 'l5-ratha-apex',
          mount: 'terrain-orbit',
          mountOffset: { x: 0, y: 18.2, z: 0 },
          fallback: { x: -60, y: 22, z: 135 },
        },
        {
          id: 'l5-cruise-ship-deck',
          mount: 'ganga-cruise-ship',
          mountOffset: { x: -8, y: 92, z: 0 },
          fallback: { x: -120, z: RIVER.z, y: 10 },
        },
        {
          id: 'l5-kirtan-followers-ghat',
          mount: 'kirtan-followers-ghat',
          mountOffset: { x: 0, y: 4.2, z: 0 },
          fallback: { x: -385, z: -170, y: 5 },
        },
        { id: 'l5-temple-grand-steps', x: ENTRANCE.doorX, y: 27.5, z: 112 },
        {
          id: 'l5-far-river-island',
          x: -320,
          y: RIVER.y + 1.1,
          z: RIVER.z - 75,
          boatOnly: true,
        },
        { id: 'l5-gurukul-sanctum-court', x: GURUKUL.x, y: 12.5, z: GURUKUL.z },
        { ...farm(0, -18, -14), id: 'l5-farms-sacred-grove', lift: 1.2 },
        { ...village(2, 14, -16), id: 'l5-village-hamlet-clearing', lift: 1.1 },
      ],
    },
  ];
}

function makeGiftPrototype() {
  const group = new THREE.Group();

  const wood = new THREE.MeshStandardMaterial({ color: 0x9c6b33, roughness: 0.65, metalness: 0.08 });
  const gold = new THREE.MeshStandardMaterial({
    color: 0xf0c14b,
    roughness: 0.3,
    metalness: 0.7,
    emissive: 0x5a3d00,
    emissiveIntensity: 0.6,
  });

  const base = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.7, 0.85), wood);
  base.position.y = 0.35;
  base.castShadow = true;

  const lid = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.26, 0.92), gold);
  lid.position.y = 0.83;
  lid.castShadow = true;

  const strap = new THREE.Mesh(new THREE.BoxGeometry(1.19, 0.72, 0.2), gold);
  strap.position.y = 0.36;

  const glint = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.16),
    new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.85 }),
  );
  glint.position.y = 1.4;

  group.add(base, lid, strap, glint);
  group.userData.glint = glint;
  return group;
}

function makeParachute() {
  const chute = new THREE.Group();

  const canopy = new THREE.Mesh(
    new THREE.ConeGeometry(2.4, 1.7, 12),
    new THREE.MeshStandardMaterial({ color: 0xfff2d0, roughness: 0.85, side: THREE.DoubleSide }),
  );
  canopy.position.y = 0.85;
  chute.add(canopy);

  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x8a7a5a, transparent: true, opacity: 0.8 });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(Math.cos(a) * 2.1, 0.2, Math.sin(a) * 2.1),
      new THREE.Vector3(0, -4.4, 0),
    ]);
    chute.add(new THREE.Line(geometry, lineMaterial));
  }

  chute.position.y = 5;
  return chute;
}

function makeBeacon() {
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 1.5, 46, 12, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xffd97a,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
      fog: false,
    }),
  );
  beacon.position.y = 23;
  return beacon;
}

function makeSmokeSignal() {
  const group = new THREE.Group();
  group.name = 'gift-smoke-signal';
  const geometry = new THREE.SphereGeometry(1, 8, 6);
  const puffs = [];
  for (let i = 0; i < 10; i++) {
    const material = new THREE.MeshBasicMaterial({
      color: 0xd93025,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);
    puffs.push({
      mesh,
      phase: i / 10,
      speed: 0.5 + Math.random() * 0.35,
      drift: Math.random() * Math.PI * 2,
    });
  }
  group.userData.puffs = puffs;
  return group;
}

function updateSmokeSignal(smoke, dt) {
  for (const puff of smoke.userData.puffs) {
    puff.phase += dt * puff.speed * 0.32;
    if (puff.phase > 1) puff.phase -= 1;
    const t = puff.phase;
    const spread = 0.7 + t * 3.4;
    puff.mesh.position.set(
      Math.cos(puff.drift + t * 2.4) * spread,
      t * 26,
      Math.sin(puff.drift + t * 2.4) * spread,
    );
    puff.mesh.scale.setScalar(0.9 + t * 2.8);
    puff.mesh.material.opacity = (1 - t) * 0.5 * Math.min(1, t * 6);
  }
}

function isDescendantOf(object, ancestor) {
  let node = object;
  while (node) {
    if (node === ancestor) return true;
    node = node.parent;
  }
  return false;
}

function makeFirstGiftLabel() {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');
  ctx.font = '700 62px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(255, 40, 20, 0.95)';
  ctx.shadowBlur = 28;
  ctx.fillStyle = '#fff2ee';
  ctx.fillText('Your first gift', canvas.width / 2, canvas.height / 2 + 4);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }),
  );
  sprite.scale.set(7.2, 1.8, 1);
  return sprite;
}

function loadSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.currentLevel === 'number') {
        const currentLevel = Math.max(1, Math.min(TOTAL_LEVELS, parsed.currentLevel));
        const foundByLevel = parsed.foundByLevel && typeof parsed.foundByLevel === 'object'
          ? parsed.foundByLevel
          : {};
        return { currentLevel, foundByLevel };
      }
    }
    // Migration from v1 storage
    const rawV1 = localStorage.getItem('mayapur-gifts-v1');
    if (rawV1) {
      const parsedV1 = JSON.parse(rawV1);
      if (parsedV1 && Array.isArray(parsedV1.found)) {
        return {
          currentLevel: 1,
          foundByLevel: { 1: parsedV1.found.filter((id) => typeof id === 'string') },
        };
      }
    }
  } catch {}
  return { currentLevel: 1, foundByLevel: {} };
}

function distanceSquared(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}

function releasePointerLock() {
  const locked = document.pointerLockElement || document.webkitPointerLockElement;
  if (!locked) return;
  const exit = document.exitPointerLock || document.webkitExitPointerLock;
  if (typeof exit === 'function') {
    try {
      exit.call(document);
    } catch {}
  }
}

export function createGame({
  scene,
  hud,
  helicopter,
  drone,
  boat = null,
  villagePoints = [],
  farmPoints = [],
  temple,
  onBlessing = null,
}) {
  const savedState = loadSavedState();
  let currentLevel = savedState.currentLevel;
  const foundByLevel = savedState.foundByLevel || {};
  if (!foundByLevel[currentLevel]) {
    foundByLevel[currentLevel] = [];
  }
  let found = foundByLevel[currentLevel];

  const templeBounds = temple || {
    minX: ENTRANCE.temple.minX,
    maxX: ENTRANCE.temple.maxX,
    minZ: ENTRANCE.temple.minZ,
    maxZ: ENTRANCE.temple.maxZ,
    maxY: ENTRANCE.temple.maxY,
  };

  const LEVEL_CONFIGS = buildLevelConfigs(villagePoints, farmPoints, templeBounds);
  const _giftWorld = new THREE.Vector3();

  let gifts = [];
  const heavenly = {
    id: `heavenly-lvl${currentLevel}`,
    question: 10,
    group: null,
    collected: false,
    x: 0,
    y: 0,
    z: 0,
    smoke: null,
  };

  let delivery = { state: 'idle' };
  let activeGift = null;
  let activeLocked = false;
  let modalOpen = false;
  let celebrating = false;
  let currentMode = 'drone';
  let elapsed = 0;
  let helicopterAudio = null;

  let firstGiftLight = null;
  let firstGiftLabel = null;

  function stopHelicopterSound() {
    if (helicopterAudio) {
      helicopterAudio.stop();
      helicopterAudio = null;
    }
  }

  const _dropRay = new THREE.Raycaster();
  const _dropOrigin = new THREE.Vector3();
  const _down = new THREE.Vector3(0, -1, 0);
  let dropProbeDistance = 0;
  const dropSurfaces = [
    'city-backdrop',
    'city-roads',
    'village',
    'farms',
    'shrine',
    'temple-entrance',
    'ridge-path',
    'far-ground',
    'ghat',
    'gurukul',
  ]
    .map((name) => scene.getObjectByName(name))
    .filter(Boolean);

  function isOverRiver(x, z) {
    return Math.abs(z - RIVER.z) <= RIVER.halfWidth && Math.abs(x) <= 1300;
  }

  const TERRAIN_HALF = TERRAIN.size * 0.5;
  function terrainSurfaceY(x, z) {
    return Math.abs(x) <= TERRAIN_HALF && Math.abs(z) <= TERRAIN_HALF ? groundHeightAt(x, z) : -Infinity;
  }

  function activeVehicle() {
    return currentMode === 'boat' && boat ? boat : drone;
  }

  function stopVehicle(vehicle) {
    if (vehicle.state.velocity && typeof vehicle.state.velocity.set === 'function') {
      vehicle.state.velocity.set(0, 0, 0);
    }
    if (typeof vehicle.state.speed === 'number') vehicle.state.speed = 0;
  }

  function save() {
    try {
      foundByLevel[currentLevel] = [...found];
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          currentLevel,
          foundByLevel,
        }),
      );
    } catch {}
  }

  function refreshCounter(visible) {
    const isComplete = found.length >= GIFT_TOTAL;
    const suffix = isComplete && currentLevel < TOTAL_LEVELS ? ' · Next Level ➔' : (isComplete ? ' · Completed ★' : '');
    hud.setGiftCounter(found.length, GIFT_TOTAL, visible, currentLevel, suffix);
  }

  function clearCurrentGifts() {
    for (const gift of gifts) {
      if (gift.group) {
        scene.remove(gift.group);
      }
    }
    gifts.length = 0;

    if (firstGiftLight) {
      scene.remove(firstGiftLight);
      firstGiftLight = null;
    }
    if (firstGiftLabel) {
      scene.remove(firstGiftLabel);
      firstGiftLabel = null;
    }
    if (heavenly.smoke) {
      scene.remove(heavenly.smoke);
      heavenly.smoke = null;
    }
    if (heavenly.group) {
      scene.remove(heavenly.group);
      heavenly.group = null;
    }

    stopHelicopterSound();
    delivery = { state: 'idle' };
    activeGift = null;
    activeLocked = false;
    hud.showGiftPrompt(false);
  }

  function setupLevel(lvl) {
    clearCurrentGifts();
    currentLevel = Math.max(1, Math.min(TOTAL_LEVELS, lvl));
    if (!foundByLevel[currentLevel]) {
      foundByLevel[currentLevel] = [];
    }
    found = foundByLevel[currentLevel];

    const config = LEVEL_CONFIGS[currentLevel - 1];

    gifts = config.spots.map((spot, index) => {
      const group = makeGiftPrototype();
      const isCollected = found.includes(spot.id);

      const gift = {
        id: spot.id,
        level: currentLevel,
        question: index,
        group,
        collected: isCollected,
        phase: index * 1.1,
        first: !!spot.first,
        boatOnly: !!spot.boatOnly,
        beacon: null,
        mountName: spot.mount || null,
        mountOffset: spot.mountOffset ? new THREE.Vector3(spot.mountOffset.x, spot.mountOffset.y, spot.mountOffset.z) : null,
        mount: null,
        fallback: spot.fallback || null,
      };

      if (spot.mount) {
        const fallback = spot.fallback || { x: 0, y: 10, z: 0 };
        gift.x = fallback.x;
        gift.y = fallback.y;
        gift.z = fallback.z;
        group.position.set(gift.x, gift.y, gift.z);
        group.visible = !gift.collected;
        scene.add(group);
        return gift;
      }

      const y = spot.y != null ? spot.y : groundHeightAt(spot.x, spot.z) + (spot.lift != null ? spot.lift : 1);
      group.position.set(spot.x, y, spot.z);
      group.visible = !gift.collected;
      scene.add(group);
      gift.x = spot.x;
      gift.y = y;
      gift.z = spot.z;
      return gift;
    });

    const firstGift = gifts.find((g) => g.first && !g.collected);
    if (firstGift) {
      firstGiftLight = new THREE.PointLight(0xff2a18, 24, 48, 1.7);
      firstGiftLight.position.set(firstGift.x, firstGift.y + 0.6, firstGift.z);
      scene.add(firstGiftLight);
      firstGiftLabel = makeFirstGiftLabel();
      firstGiftLabel.position.set(firstGift.x, firstGift.y + 3.4, firstGift.z);
      scene.add(firstGiftLabel);
    }

    heavenly.id = `heavenly-lvl${currentLevel}`;
    heavenly.question = 10;
    heavenly.collected = found.includes(heavenly.id);
    heavenly.group = null;
    heavenly.smoke = null;
    delivery = { state: 'idle' };

    if (!heavenly.collected && found.length === GIFT_TOTAL - 1) {
      startDelivery();
    }
  }

  function startDelivery() {
    if (delivery.state !== 'idle' || heavenly.collected) return;
    const config = LEVEL_CONFIGS[currentLevel - 1];
    const zone = config.dropZone || DROP_ZONES[(currentLevel - 1) % DROP_ZONES.length];
    const drop = {
      x: zone.x,
      z: zone.z,
      y: groundHeightAt(zone.x, zone.z) + 1,
      label: zone.label,
    };
    delivery = { state: 'incoming', drop };

    const h = helicopter.userData;
    h.mode = 'flying';
    h.progress = 0;
    h.start.set(drop.x - 620, 150, drop.z - 260);
    h.end.set(drop.x + 160, 125, drop.z + 90);
    h.distance = Math.max(1, h.start.distanceTo(h.end));
    h.speed = 44;
    helicopter.position.copy(h.start);
    helicopter.lookAt(h.end);
    helicopter.visible = true;

    if (!helicopterAudio) helicopterAudio = startHelicopterLoop();
    hud.setGameHint(`🎁 Level ${currentLevel} final gift is arriving by helicopter…`, 12000);
  }

  function landHeavenly(y) {
    if (isOverRiver(heavenly.x, heavenly.z)) {
      y = Math.max(y, RIVER.y + 0.15);
    }
    heavenly.y = y;
    heavenly.group.position.set(heavenly.x, heavenly.y, heavenly.z);

    const chute = heavenly.group.userData.chute;
    if (chute) heavenly.group.remove(chute);
    heavenly.group.userData.chute = null;

    const beacon = makeBeacon();
    heavenly.group.add(beacon);
    heavenly.group.userData.beacon = beacon;

    const smoke = makeSmokeSignal();
    smoke.position.set(heavenly.x, heavenly.y, heavenly.z);
    scene.add(smoke);
    heavenly.smoke = smoke;

    delivery.state = 'landed';
    hud.setGameHint(`🎁 The big gift landed near ${delivery.drop.label} — follow the red smoke!`, 12000);
  }

  function releaseHeavenly() {
    heavenly.x = delivery.drop.x;
    heavenly.z = delivery.drop.z;
    heavenly.y = helicopter.position.y - 8;

    const group = makeGiftPrototype();
    group.scale.setScalar(2.4);
    const chute = makeParachute();
    group.add(chute);
    group.userData.chute = chute;
    group.position.set(heavenly.x, heavenly.y, heavenly.z);
    scene.add(group);

    heavenly.group = group;
    heavenly.smoke = null;
    dropProbeDistance = 0;
    delivery.state = 'falling';
    stopHelicopterSound();
    hud.setGameHint(`🎁 The big gift dropped near ${delivery.drop.label} — watch where it falls!`, 12000);
  }

  function updateDelivery(dt, listenerPos) {
    if (delivery.state === 'idle') {
      if (!heavenly.collected && found.length === GIFT_TOTAL - 1) startDelivery();
      return;
    }

    if (delivery.state === 'incoming') {
      const hp = helicopter.position;
      if (helicopterAudio && listenerPos) {
        const distance = Math.hypot(hp.x - listenerPos.x, hp.y - listenerPos.y, hp.z - listenerPos.z);
        helicopterAudio.setVolume(Math.max(0, 1 - distance / 420) * 0.2);
      }
      if (Math.hypot(hp.x - delivery.drop.x, hp.z - delivery.drop.z) < 70) releaseHeavenly();
      return;
    }

    stopHelicopterSound();

    if (delivery.state === 'falling') {
      const step = 13 * dt;
      heavenly.y -= step;
      dropProbeDistance += step;
      heavenly.group.position.set(heavenly.x, heavenly.y, heavenly.z);
      heavenly.group.rotation.y += dt * 0.5;

      if (dropProbeDistance >= 2) {
        _dropOrigin.set(heavenly.x, heavenly.y - 0.5, heavenly.z);
        _dropRay.set(_dropOrigin, _down);
        _dropRay.far = dropProbeDistance + 2.5;
        const hits = _dropRay.intersectObjects(dropSurfaces, true);
        const hit = hits.find((h) => !isDescendantOf(h.object, heavenly.group));
        dropProbeDistance = 0;
        if (hit) {
          const landY = Math.max(hit.point.y, terrainSurfaceY(heavenly.x, heavenly.z));
          landHeavenly(landY + 0.05);
          return;
        }
      }

      const terrainY = terrainSurfaceY(heavenly.x, heavenly.z);
      if (terrainY > -Infinity && heavenly.y <= terrainY + 0.2) {
        landHeavenly(terrainY + 0.2);
      } else if (heavenly.y <= -3.5) {
        landHeavenly(Math.max(terrainY, -3.65) + 0.05);
      }
      return;
    }

    if (delivery.state === 'landed' && heavenly.group) {
      const beacon = heavenly.group.userData.beacon;
      if (beacon) beacon.material.opacity = 0.14 + Math.sin(elapsed * 2.2) * 0.07;
      heavenly.group.rotation.y += dt * 0.5;
      if (heavenly.smoke) updateSmokeSignal(heavenly.smoke, dt);
    }
  }

  function setPrompt(gift, locked = false) {
    if (gift === activeGift && locked === activeLocked) return;
    activeGift = gift;
    activeLocked = locked;
    hud.showGiftPrompt(!!gift, locked ? '🔒 Boat ride needed' : '🎁 Open gift');
    if (gift && !locked) releasePointerLock();
  }

  function tryOpenActiveGift() {
    if (!activeGift) return;
    if (activeLocked) {
      hud.setGameHint('🔒 This gift floats on the holy Ganga — ride the boat from the ghat to unlock it', 9000);
      return;
    }
    if (!modalOpen) openGift(activeGift);
  }

  function collectGift(gift) {
    if (gift.collected) return;
    gift.collected = true;
    if (gift.group) gift.group.visible = false;
    if (gift.first && firstGiftLight) {
      scene.remove(firstGiftLight);
      scene.remove(firstGiftLabel);
      firstGiftLight = null;
      firstGiftLabel = null;
    }
    if (gift.smoke) {
      scene.remove(gift.smoke);
      gift.smoke = null;
    }
    if (!found.includes(gift.id)) found.push(gift.id);
    save();
    playQuestComplete();
    refreshCounter(true);
    activeGift = null;
    hud.showGiftPrompt(false);

    if (found.length >= GIFT_TOTAL) {
      const vehicle = activeVehicle();
      celebrating = true;
      playYatraComplete();
      vehicle.state.enabled = false;
      stopVehicle(vehicle);
      releasePointerLock();

      setTimeout(() => {
        if (typeof onBlessing === 'function') onBlessing();
        showLevelBlessingModal();
      }, 700);
    } else if (found.length === GIFT_TOTAL - 1) {
      startDelivery();
    } else if (found.length === 1 && currentLevel === 1) {
      hud.setGameHint('🎁 Now grab the next gift — search Mayapur on your own!', 9000);
    }
  }

  function showLevelBlessingModal() {
    const isMaxLevel = currentLevel >= TOTAL_LEVELS;
    const nextLevel = currentLevel + 1;
    const config = LEVEL_CONFIGS[currentLevel - 1];

    hud.showBlessing({
      title: isMaxLevel ? 'GRAND PARIKRAMA MASTER · BLESSED 🙏' : `LEVEL ${currentLevel} COMPLETE · BLESSED 🙏`,
      text: isMaxLevel
        ? 'Hare Krishna! You have discovered all 55 sacred gifts across all 5 levels of Sri Mayapur Dham! May the eternal mercy of Sri Chaitanya Mahaprabhu, Lord Narsimhadeva, and Srila Prabhupada shower upon you forever.'
        : (config.blessingText || `You found all 11 gifts in Level ${currentLevel}! Advance to Level ${nextLevel} for 11 new hidden gifts across Mayapur Dham.`),
      nextButtonText: isMaxLevel ? '↺ Replay All 5 Levels' : `Begin Level ${nextLevel} ➔`,
      onNextLevel: () => {
        celebrating = false;
        const vehicle = activeVehicle();
        vehicle.state.enabled = true;
        if (isMaxLevel) {
          resetAllLevels();
        } else {
          advanceToLevel(nextLevel);
        }
      },
      onClose: () => {
        celebrating = false;
        const vehicle = activeVehicle();
        vehicle.state.enabled = true;
      },
    });
  }

  function recapturePointer() {
    const desktopPointer = window.matchMedia
      && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!desktopPointer || typeof drone.capturePointer !== 'function') return;
    const attempt = drone.capturePointer();
    if (attempt && typeof attempt.catch === 'function') {
      attempt.catch(() => {
        hud.setGameHint('Click anywhere to capture the cursor and keep flying', 4500);
      });
    }
  }

  function openGift(gift) {
    if (!gift || gift.collected || modalOpen) return;
    modalOpen = true;

    const vehicle = activeVehicle();
    const restoreEnabled = vehicle.state.enabled;
    vehicle.state.enabled = false;
    stopVehicle(vehicle);
    releasePointerLock();

    const config = LEVEL_CONFIGS[currentLevel - 1];
    const entry = config.questions[gift.question];
    hud.openQuestion(entry.question, entry.options, (choice) => {
      if (choice !== entry.answer) return false;
      modalOpen = false;
      vehicle.state.enabled = restoreEnabled;
      collectGift(gift);
      if (!celebrating && currentMode !== 'boat') recapturePointer();
      return true;
    });
  }

  function advanceToLevel(levelNumber) {
    setupLevel(levelNumber);
    save();
    refreshCounter(true);
    const config = LEVEL_CONFIGS[currentLevel - 1];
    hud.setGameHint(`🌟 Welcome to Level ${currentLevel}: ${config.name}! 11 new sacred gifts are hidden across Mayapur.`, 9000);
    recapturePointer();
  }

  window.addEventListener('keydown', (e) => {
    if (e.repeat || e.code !== 'KeyF') return;
    if (modalOpen) return;
    tryOpenActiveGift();
  });

  hud.onGiftOpen(() => {
    if (modalOpen) return;
    tryOpenActiveGift();
  });

  hud.onGiftCounterClick(() => {
    if (modalOpen) return;
    if (found.length >= GIFT_TOTAL) {
      showLevelBlessingModal();
    }
  });

  function update(dt, ctx) {
    elapsed += dt;
    currentMode = ctx.mode;

    for (const gift of gifts) {
      if (gift.collected) continue;

      if (gift.mountName) {
        if (!gift.mount) {
          gift.mount = scene.getObjectByName(gift.mountName);
        }
        if (gift.mount) {
          gift.mount.getWorldPosition(_giftWorld);
          const off = gift.mountOffset || { x: 0, y: 0, z: 0 };
          gift.x = _giftWorld.x + off.x;
          gift.y = _giftWorld.y + off.y;
          gift.z = _giftWorld.z + off.z;
        }
      }

      gift.group.position.set(
        gift.x,
        gift.y + Math.sin(elapsed * 1.7 + gift.phase) * 0.12,
        gift.z,
      );
      gift.group.rotation.y = elapsed * 0.5 + gift.phase;
      const glint = gift.group.userData.glint;
      if (glint) glint.rotation.y = elapsed * 2.2;
      if (gift.beacon) gift.beacon.material.opacity = 0.16 + Math.sin(elapsed * 2.1) * 0.09;
    }

    if (firstGiftLight && firstGiftLabel) {
      const fg = gifts.find((g) => g.first && !g.collected);
      if (fg) {
        firstGiftLight.intensity = 24 + Math.sin(elapsed * 3.1) * 12;
        firstGiftLabel.position.y = fg.y + 3.4 + Math.sin(elapsed * 1.8) * 0.3;
      }
    }

    const inVehicle = ctx.mode === 'drone' || ctx.mode === 'boat';
    const playing = ctx.phase === 'playing' && inVehicle;
    refreshCounter(playing);
    if (!playing) {
      setPrompt(null);
      return;
    }

    if (modalOpen) {
      const vehicle = activeVehicle();
      vehicle.state.enabled = false;
      stopVehicle(vehicle);
    }

    const activePos = ctx.mode === 'boat' && ctx.boatPos ? ctx.boatPos : ctx.dronePos;
    updateDelivery(dt, activePos);

    let nearest = null;
    let nearestD2 = OPEN_RADIUS * OPEN_RADIUS;
    for (const gift of gifts) {
      if (gift.collected) continue;
      if (gift.boatOnly && ctx.mode !== 'boat') continue;
      const d2 = distanceSquared(activePos, gift);
      if (d2 < nearestD2) {
        nearest = gift;
        nearestD2 = d2;
      }
    }

    if (delivery.state === 'landed' && !heavenly.collected) {
      const d2 = distanceSquared(activePos, heavenly);
      if (d2 < nearestD2) nearest = heavenly;
    }

    let locked = null;
    if (!nearest && ctx.mode === 'drone') {
      let lockedD2 = OPEN_RADIUS * OPEN_RADIUS;
      for (const gift of gifts) {
        if (gift.collected || !gift.boatOnly) continue;
        const d2 = distanceSquared(activePos, gift);
        if (d2 < lockedD2) {
          locked = gift;
          lockedD2 = d2;
        }
      }
    }

    setPrompt(nearest || locked, !!locked && !nearest);
  }

  function resetCurrentLevel() {
    found.length = 0;
    foundByLevel[currentLevel] = [];
    save();
    setupLevel(currentLevel);
    refreshCounter(false);
  }

  function resetAllLevels() {
    for (let i = 1; i <= TOTAL_LEVELS; i++) {
      foundByLevel[i] = [];
    }
    currentLevel = 1;
    found = foundByLevel[1];
    save();
    setupLevel(1);
    refreshCounter(false);
    hud.setGameHint('🌟 Journey reset to Level 1. Begin your sacred quest!', 6000);
  }

  // Initialize level
  setupLevel(currentLevel);

  return {
    update,
    reset: resetCurrentLevel,
    resetAll: resetAllLevels,
    advanceToLevel,
    isInteracting: () => modalOpen || celebrating || activeGift != null,
    state: () => ({ currentLevel, found: [...found], delivery: delivery.state }),
    level: () => currentLevel,
    gifts: () => gifts.map((g) => ({
      id: g.id,
      level: currentLevel,
      x: Math.round(g.x * 10) / 10,
      y: Math.round(g.y * 10) / 10,
      z: Math.round(g.z * 10) / 10,
      collected: g.collected,
      boatOnly: !!g.boatOnly,
      mount: g.mountName || null,
    })),
    remaining: () => {
      const list = gifts
        .filter((g) => !g.collected)
        .map((g) => ({
          id: g.id,
          level: currentLevel,
          x: Math.round(g.x),
          y: Math.round(g.y),
          z: Math.round(g.z),
          boatOnly: !!g.boatOnly,
          mount: g.mountName || null,
        }));
      if (!heavenly.collected) {
        list.push({ id: heavenly.id, note: 'helicopter drop - follow the red smoke' });
      }
      return list;
    },
  };
}
