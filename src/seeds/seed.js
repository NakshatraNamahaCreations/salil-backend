const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../modules/users/User.model');
const Admin = require('../modules/users/Admin.model');
const Author = require('../modules/authors/Author.model');
const Wallet = require('../modules/wallet/Wallet.model');
const Category = require('../modules/categories/Category.model');
const Tag = require('../modules/categories/Tag.model');
const CoinPack = require('../modules/wallet/CoinPack.model');
const Book = require('../modules/books/Book.model');
const Chapter = require('../modules/chapters/Chapter.model');
const PodcastSeries = require('../modules/podcasts/PodcastSeries.model');
const PodcastEpisode = require('../modules/podcasts/PodcastEpisode.model');
const Video = require('../modules/videos/Video.model');
const VideoSeries = require('../modules/videos/VideoSeries.model');
const Audiobook = require('../modules/audiobooks/Audiobook.model');
const Banner = require('../modules/banners/Banner.model');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/saliljaveri';

// Picsum generates consistent, beautiful images from a seed word
const img = (seed, w = 400, h = 600) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

// Local AI generated images — use BASE_URL env var so real devices can reach the server
const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || 5001}`;
const localImg = (filename) => `${BASE_URL}/images/${filename}`;

// YouTube thumbnail URL
const ytThumb = (videoId) =>
  `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

const seed = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // ─── Clear existing data ──────────────────────────────────
    await Promise.all([
      User.deleteMany({}),
      Admin.deleteMany({}),
      Author.deleteMany({}),
      Wallet.deleteMany({}),
      Category.deleteMany({}),
      Tag.deleteMany({}),
      CoinPack.deleteMany({}),
      Book.deleteMany({}),
      Chapter.deleteMany({}),
      PodcastSeries.deleteMany({}),
      PodcastEpisode.deleteMany({}),
      Video.deleteMany({}),
      VideoSeries.deleteMany({}),
      Audiobook.deleteMany({}),
      Banner.deleteMany({}),
    ]);
    console.log('Cleared existing data');

    // ─── Create Super Admin ───────────────────────────────────
    const superAdmin = await User.create({
      name: 'Super Admin',
      email: 'admin@saliljaveri.com',
      phone: '+91-9999999991',
      phoneVerified: true,
      passwordHash: 'admin123456',
      role: 'superadmin',
      isVerified: true,
    });

    await Admin.create({
      userId: superAdmin._id,
      permissions: [
        'manage_users', 'manage_authors', 'manage_books', 'manage_chapters',
        'manage_audiobooks', 'manage_podcasts', 'manage_videos', 'manage_banners',
        'manage_wallet', 'manage_payments', 'manage_notifications', 'manage_reviews',
        'manage_settings', 'manage_analytics', 'manage_releases', 'manage_promos',
      ],
      assignedBy: superAdmin._id,
    });
    console.log('✅ Super Admin created: admin@saliljaveri.com / admin123456');

    // ─── Create Authors ───────────────────────────────────────
    const authorUser1 = await User.create({
      name: 'Salil Javeri',
      email: 'salil@saliljaveri.com',
      phone: '+91-9999999992',
      phoneVerified: true,
      passwordHash: 'author123456',
      role: 'author',
      isVerified: true,
    });

    const author1 = await Author.create({
      userId: authorUser1._id,
      displayName: 'Salil Javeri',
      bio: 'Bestselling author and storyteller. Exploring worlds of fiction, philosophy, and human experience through compelling narratives.',
      avatar: img('salil-author', 200, 200),
      isApproved: true,
      approvedBy: superAdmin._id,
      contentPermissions: {
        canUploadBooks: true,
        canUploadPodcasts: true,
        canUploadVideos: true,
        canUseYoutubeLinks: true,
      },
    });
    await Wallet.create({ userId: authorUser1._id });

    const authorUser2 = await User.create({
      name: 'Priya Sharma',
      email: 'priya@saliljaveri.com',
      phone: '+91-9999999994',
      phoneVerified: true,
      passwordHash: 'author123456',
      role: 'author',
      isVerified: true,
    });

    const author2 = await Author.create({
      userId: authorUser2._id,
      displayName: 'Priya Sharma',
      bio: 'Wellness coach, mindfulness teacher, and author. Helping people find balance in a chaotic world through practical wisdom.',
      avatar: img('priya-author', 200, 200),
      isApproved: true,
      approvedBy: superAdmin._id,
      contentPermissions: {
        canUploadBooks: true,
        canUploadPodcasts: true,
        canUploadVideos: true,
        canUseYoutubeLinks: true,
      },
    });
    await Wallet.create({ userId: authorUser2._id });

    const authorUser3 = await User.create({
      name: 'Rohan Kapoor',
      email: 'rohan@saliljaveri.com',
      phone: '+91-9999999995',
      phoneVerified: true,
      passwordHash: 'author123456',
      role: 'author',
      isVerified: true,
    });

    const author3 = await Author.create({
      userId: authorUser3._id,
      displayName: 'Rohan Kapoor',
      bio: 'Tech entrepreneur, developer educator, and startup mentor. Making technology accessible and exciting for the next generation.',
      avatar: img('rohan-author', 200, 200),
      isApproved: true,
      approvedBy: superAdmin._id,
      contentPermissions: {
        canUploadBooks: true,
        canUploadPodcasts: true,
        canUploadVideos: true,
        canUseYoutubeLinks: true,
      },
    });
    await Wallet.create({ userId: authorUser3._id });

    console.log('✅ 3 Authors created');

    // ─── Sample Reader ────────────────────────────────────────
    const readerUser = await User.create({
      name: 'Test Reader',
      email: 'reader@saliljaveri.com',
      phone: '+91-9999999993',
      phoneVerified: true,
      passwordHash: 'reader123456',
      role: 'reader',
      isVerified: true,
    });
    await Wallet.create({
      userId: readerUser._id,
      totalCoins: 500,
      availableCoins: 500,
      bonusCoins: 50,
    });
    console.log('✅ Reader created: reader@saliljaveri.com / reader123456 (500 coins)');

    // ─── Categories ───────────────────────────────────────────
    const categories = await Category.insertMany([
      { name: 'Fiction', slug: 'fiction', description: 'Novels and fictional stories', sortOrder: 1, icon: '📖' },
      { name: 'Non-Fiction', slug: 'non-fiction', description: 'Real world topics and knowledge', sortOrder: 2, icon: '🌍' },
      { name: 'Self-Help', slug: 'self-help', description: 'Personal development and growth', sortOrder: 3, icon: '🌱' },
      { name: 'Technology', slug: 'technology', description: 'Tech, programming, and innovation', sortOrder: 4, icon: '💻' },
      { name: 'Business', slug: 'business', description: 'Business strategy and entrepreneurship', sortOrder: 5, icon: '💼' },
      { name: 'Poetry', slug: 'poetry', description: 'Poems and lyrical writing', sortOrder: 6, icon: '✍️' },
      { name: 'Philosophy', slug: 'philosophy', description: 'Deep thinking and wisdom', sortOrder: 7, icon: '🧠' },
      { name: 'Thriller', slug: 'thriller', description: 'Suspense and mystery', sortOrder: 8, icon: '🔍' },
      { name: 'Health & Wellness', slug: 'health-wellness', description: 'Mind, body, and spirit', sortOrder: 9, icon: '🧘' },
      { name: 'Science', slug: 'science', description: 'Scientific discoveries and concepts', sortOrder: 10, icon: '🔬' },
    ]);
    console.log(`✅ ${categories.length} Categories created`);

    const catFiction = categories[0];
    const catNonFiction = categories[1];
    const catSelfHelp = categories[2];
    const catTech = categories[3];
    const catBusiness = categories[4];
    const catPhilosophy = categories[6];
    const catThriller = categories[7];
    const catWellness = categories[8];

    // ─── Tags ─────────────────────────────────────────────────
    const tags = await Tag.insertMany([
      { name: 'bestseller', slug: 'bestseller' },
      { name: 'new release', slug: 'new-release' },
      { name: 'editors pick', slug: 'editors-pick' },
      { name: 'trending', slug: 'trending' },
      { name: 'must read', slug: 'must-read' },
      { name: 'award winning', slug: 'award-winning' },
      { name: 'classic', slug: 'classic' },
      { name: 'motivational', slug: 'motivational' },
    ]);
    console.log(`✅ ${tags.length} Tags created`);

    // ─── Coin Packs ───────────────────────────────────────────
    await CoinPack.insertMany([
      { name: 'Starter Pack', coins: 50, bonusCoins: 0, priceINR: 49, priceUSD: 0.99, sortOrder: 1 },
      { name: 'Reader Pack', coins: 150, bonusCoins: 10, priceINR: 129, priceUSD: 1.99, sortOrder: 2 },
      { name: 'Book Lover', coins: 500, bonusCoins: 50, priceINR: 399, priceUSD: 4.99, sortOrder: 3, isOffer: true, offerLabel: '10% Bonus!' },
      { name: 'Premium Pack', coins: 1200, bonusCoins: 200, priceINR: 899, priceUSD: 10.99, sortOrder: 4, isOffer: true, offerLabel: 'Best Value!' },
      { name: 'Ultra Pack', coins: 3000, bonusCoins: 750, priceINR: 1999, priceUSD: 24.99, sortOrder: 5, isOffer: true, offerLabel: '25% Bonus!' },
    ]);

    // ─── Books ────────────────────────────────────────────────
    const book1 = await Book.create({
      title: 'The Silent Observer',
      description: 'A gripping thriller about a man who witnesses something he shouldn\'t have. As he navigates a dangerous web of secrets, he must decide what truths are worth dying for.',
      authorId: author1._id,
      coverImage: localImg('cover_silent.png'),
      genres: ['Thriller', 'Mystery'],
      categoryId: catThriller._id,
      tags: [tags[0]._id, tags[3]._id],
      status: 'published',
      isPublished: true,
      isFeatured: true,
      totalChapters: 3,
      totalReads: 2840,
      averageRating: 4.7,
      ratingCount: 312,
      publishedAt: new Date('2024-11-01'),
    });

    const book2 = await Book.create({
      title: 'Fragments of Tomorrow',
      description: 'A philosophical journey through time and consciousness. Salil explores what it means to exist in a world where every choice creates a new reality.',
      authorId: author1._id,
      coverImage: localImg('cover_fragments.png'),
      genres: ['Fiction', 'Philosophy'],
      categoryId: catPhilosophy._id,
      tags: [tags[2]._id, tags[4]._id],
      status: 'published',
      isPublished: true,
      isFeatured: true,
      totalChapters: 3,
      totalReads: 1560,
      averageRating: 4.5,
      ratingCount: 198,
      publishedAt: new Date('2024-12-15'),
    });

    const book3 = await Book.create({
      title: 'Code & Canvas',
      description: 'Where technology meets art. A unique exploration of creativity in the digital age, blending programming concepts with artistic expression.',
      authorId: author3._id,
      coverImage: localImg('cover_code.png'),
      genres: ['Non-Fiction', 'Technology'],
      categoryId: catTech._id,
      tags: [tags[1]._id, tags[7]._id],
      status: 'published',
      isPublished: true,
      totalChapters: 2,
      totalReads: 890,
      averageRating: 4.3,
      ratingCount: 127,
      publishedAt: new Date('2025-01-10'),
    });

    const book4 = await Book.create({
      title: 'The Mindful Entrepreneur',
      description: 'How to build a thriving business without sacrificing your mental health. Priya Sharma combines mindfulness practices with cutting-edge business strategy.',
      authorId: author2._id,
      coverImage: localImg('cover_mindful.png'),
      genres: ['Business', 'Self-Help'],
      categoryId: catBusiness._id,
      tags: [tags[0]._id, tags[7]._id],
      status: 'published',
      isPublished: true,
      isFeatured: true,
      totalChapters: 3,
      totalReads: 3210,
      averageRating: 4.8,
      ratingCount: 445,
      publishedAt: new Date('2025-02-01'),
    });

    const book5 = await Book.create({
      title: 'Atomic Clarity',
      description: 'Small shifts in thinking, massive changes in life. A practical guide to rewiring your mindset using neuroscience-backed techniques.',
      authorId: author2._id,
      coverImage: localImg('cover_atomic.png'),
      genres: ['Self-Help', 'Science'],
      categoryId: catSelfHelp._id,
      tags: [tags[3]._id, tags[4]._id],
      status: 'published',
      isPublished: true,
      totalChapters: 2,
      totalReads: 2100,
      averageRating: 4.6,
      ratingCount: 289,
      publishedAt: new Date('2025-03-01'),
    });

    console.log('✅ 5 Books created');

    // ─── Chapters ─────────────────────────────────────────────
    const chaptersBook1 = await Chapter.insertMany([
      {
        bookId: book1._id, title: 'The Encounter', orderNumber: 1,
        sourceType: 'richtext', isFree: true, coinCost: 0, status: 'published', publishedAt: new Date(),
        contentHtml: `<h1>Chapter 1: The Encounter</h1>
<p>The rain hammered against the window of the old café on Marine Drive. Arjun Mehta sat in his usual corner, nursing a cup of chai that had long gone cold. He watched the world outside through foggy glass — the blur of yellow taxis, the silhouettes of couples sharing umbrellas, and the relentless sea crashing against the promenade.</p>
<p>It was a Monday evening, unremarkable in every way. Until it wasn't.</p>
<p>The man walked in at exactly 7:47 PM. Arjun noticed because he always noticed things — it was both his gift and his curse. The man was tall, impeccably dressed in a charcoal suit that didn't belong in a chai shop. He carried no umbrella, yet his clothes were perfectly dry.</p>
<blockquote>Some moments arrive disguised as ordinary. They slip into your life wearing the mask of routine, only to rip everything apart when you least expect it.</blockquote>
<p>The stranger sat two tables away. He placed a brown envelope on the table and made a phone call. Arjun couldn't hear the words, but the man's expression told a story — urgency, fear, and something that looked disturbingly like guilt.</p>`,
      },
      {
        bookId: book1._id, title: 'The Photograph', orderNumber: 2,
        sourceType: 'richtext', isFree: false, coinCost: 15, status: 'published', publishedAt: new Date(),
        contentHtml: `<h1>Chapter 2: The Photograph</h1>
<p>Arjun found the photograph tucked between the pages of the newspaper the stranger had left behind. It was a professional shot — a group of men standing in front of a warehouse, their faces caught between shadow and fluorescent light.</p>
<p>He recognized one of the faces immediately. It was the kind of face that appeared on news channels and election billboards. Minister Vikram Rathore, smiling his trademark smile, standing next to men who definitely did not belong in a politician's known circle.</p>
<p>Arjun's journalist instincts kicked in. He had spent fifteen years at the Mumbai Chronicle before burning out and retreating to his café corner existence. But the fire, he realized, had only been dormant, not extinguished.</p>`,
      },
      {
        bookId: book1._id, title: 'The Revelation', orderNumber: 3,
        sourceType: 'richtext', isFree: false, coinCost: 15, status: 'published', publishedAt: new Date(),
        contentHtml: `<h1>Chapter 3: The Revelation</h1>
<p>The warehouse in the photograph was exactly where Arjun expected it to be — in the industrial wasteland between Andheri and Goregaon, where no one asks questions and everyone minds their own business.</p>
<p>What he didn't expect was the scale of what he found inside.</p>
<p>Rows upon rows of servers, humming with data. Screens displaying financial transactions that spanned continents. And in the center of it all, a digital ledger that connected some of the most powerful people in the country to a shadow economy worth billions.</p>
<blockquote>"The truth is just a story that hasn't found its audience yet."</blockquote>`,
      },
    ]);

    const chaptersBook2 = await Chapter.insertMany([
      {
        bookId: book2._id, title: 'The First Fragment', orderNumber: 1,
        sourceType: 'richtext', isFree: true, coinCost: 0, status: 'published', publishedAt: new Date(),
        contentHtml: `<h1>Chapter 1: The First Fragment</h1>
<p>Time, they say, is a river. But rivers flow in one direction. Time, Maya discovered, was more like an ocean — vast, deep, and full of currents that could pull you in directions you never imagined.</p>
<p>She found the first fragment on a Tuesday morning, floating in her coffee. Not literally, of course. It appeared as a thought — vivid, complete, and utterly foreign. A memory of a conversation she had never had, in a language she had never spoken, about a future she could not possibly know.</p>
<h2>The Nature of Consciousness</h2>
<p>Maya was a neuroscientist at IISc Bangalore. She studied consciousness — that slippery, indefinable thing that separates a thinking being from a sophisticated machine. Her research had always been strictly scientific, grounded in neuroimaging and cognitive models.</p>`,
      },
      {
        bookId: book2._id, title: 'Parallel Lines', orderNumber: 2,
        sourceType: 'richtext', isFree: false, coinCost: 20, status: 'published', publishedAt: new Date(),
        contentHtml: `<h1>Chapter 2: Parallel Lines</h1>
<p>The fragments kept coming. Each one was a window into a different version of her life — a life where she had made different choices. In one fragment, she was a musician performing at Carnegie Hall. In another, she was a farmer in Kerala, her hands deep in red soil.</p>
<p>"If consciousness is just information processing," she wrote in her journal, "then perhaps all versions of me are being processed simultaneously. The question is not which Maya is real, but whether reality itself is multiple."</p>`,
      },
      {
        bookId: book2._id, title: 'Convergence', orderNumber: 3,
        sourceType: 'richtext', isFree: false, coinCost: 20, status: 'published', publishedAt: new Date(),
        contentHtml: `<h1>Chapter 3: Convergence</h1>
<p>The experiment was simple in design but terrifying in implications. Maya built a device — part EEG, part quantum sensor — that could detect the fragments in real-time. She called it the Convergence Engine.</p>
<p>When she turned it on for the first time, every fragment collapsed into a single point of awareness. For exactly 4.7 seconds, Maya experienced all her lives simultaneously.</p>
<blockquote>"We are all infinite. We have just agreed to be small."</blockquote>`,
      },
    ]);

    const chaptersBook3 = await Chapter.insertMany([
      {
        bookId: book3._id, title: 'The Algorithm of Beauty', orderNumber: 1,
        sourceType: 'richtext', isFree: true, coinCost: 0, status: 'published', publishedAt: new Date(),
        contentHtml: `<h1>Chapter 1: The Algorithm of Beauty</h1>
<p>Can beauty be computed? From the golden ratio to fractal mathematics, humans have always sought patterns in things that move us aesthetically. But the age of AI has given this question new urgency.</p>
<ul><li>A programmer debugging code is performing a creative act</li><li>A painter choosing colors is making algorithmic decisions</li><li>Both are solving the same fundamental problem: how to make something meaningful from nothing</li></ul>`,
      },
      {
        bookId: book3._id, title: 'Digital Renaissance', orderNumber: 2,
        sourceType: 'richtext', isFree: false, coinCost: 15, status: 'published', publishedAt: new Date(),
        contentHtml: `<h1>Chapter 2: Digital Renaissance</h1>
<p>We are living through a renaissance, and most of us don\'t know it. The last time art and technology collided with this much force was in 15th-century Florence, when Brunelleschi used engineering to build the impossible dome of the cathedral.</p>
<p>Today's renaissance is digital. The tools are different — JavaScript instead of oil paint, servers instead of stone — but the spirit is the same.</p>
<p><strong>Technology is not the art. Technology is the canvas.</strong></p>`,
      },
    ]);

    const chaptersBook4 = await Chapter.insertMany([
      {
        bookId: book4._id, title: 'The Mindful Foundation', orderNumber: 1,
        sourceType: 'richtext', isFree: true, coinCost: 0, status: 'published', publishedAt: new Date(),
        contentHtml: `<h1>Chapter 1: The Mindful Foundation</h1>
<p>Before you build a business, you must build yourself. This is not motivational rhetoric — it is operational truth. The most resilient companies in the world are built by people who have done the inner work.</p>
<p>Mindfulness, stripped of its spiritual packaging, is a performance tool. It sharpens attention, reduces reactivity, and increases the capacity for complex decision-making. In a world that rewards speed, the ability to pause is a superpower.</p>`,
      },
      {
        bookId: book4._id, title: 'Systems Over Hustle', orderNumber: 2,
        sourceType: 'richtext', isFree: false, coinCost: 20, status: 'published', publishedAt: new Date(),
        contentHtml: `<h1>Chapter 2: Systems Over Hustle</h1>
<p>Hustle culture is a trap. It rewards activity over output, motion over progress, and busyness over results. The entrepreneur who works 18-hour days is not more successful — they are more exhausted.</p>
<p>The alternative is systems thinking: designing your work so that it produces results even when you are not actively pushing. This requires upfront investment in process, clarity of outcome, and the discipline to resist urgency.</p>`,
      },
      {
        bookId: book4._id, title: 'The Compound Effect of Stillness', orderNumber: 3,
        sourceType: 'richtext', isFree: false, coinCost: 20, status: 'published', publishedAt: new Date(),
        contentHtml: `<h1>Chapter 3: The Compound Effect of Stillness</h1>
<p>Ten minutes of daily meditation, practiced consistently, will transform your business within a year. Not because meditation is magic, but because of what it does to your decision-making architecture.</p>
<p>Every major decision you make in your business passes through your nervous system. A regulated nervous system makes better decisions. The compound effect of thousands of better decisions is a fundamentally different business outcome.</p>`,
      },
    ]);

    const chaptersBook5 = await Chapter.insertMany([
      {
        bookId: book5._id, title: 'The Clarity Problem', orderNumber: 1,
        sourceType: 'richtext', isFree: true, coinCost: 0, status: 'published', publishedAt: new Date(),
        contentHtml: `<h1>Chapter 1: The Clarity Problem</h1>
<p>Most people aren't struggling with motivation. They're struggling with clarity. You cannot be motivated to do something you can\'t see clearly. The brain doesn\'t run toward blurry targets.</p>
<p>Atomic Clarity is the practice of breaking large, fuzzy goals into small, crystal-clear actions. Not goals — actions. Not "get fit" — "do 10 pushups before brushing teeth." The atomic unit of behavior is the trigger-action pair.</p>`,
      },
      {
        bookId: book5._id, title: 'Rewiring the Default', orderNumber: 2,
        sourceType: 'richtext', isFree: false, coinCost: 18, status: 'published', publishedAt: new Date(),
        contentHtml: `<h1>Chapter 2: Rewiring the Default</h1>
<p>Your current behavior is perfectly optimized for your current environment. If you want different behavior, change the environment first. Willpower is a finite resource. Environment design is infinite leverage.</p>
<p>The neuroscience is unambiguous: habits are stored as procedural memories, not declarative ones. They bypass conscious thought. To change them, you must intervene at the cue level, not the action level.</p>`,
      },
    ]);

    console.log('✅ 13 Chapters created across 5 books');

    // ─── Audiobooks (chapters as audio) ──────────────────────
    // The Silent Observer - chapter 1 (free), chapter 2 (coins)
    const audiobookData = [
      {
        bookId: book1._id, chapterId: chaptersBook1[0]._id,
        title: 'The Encounter – Narrated',
        duration: 1320, narrator: 'Rahul Voiceover',
        isFree: true, coinCost: 0, listenCount: 842, status: 'published',
      },
      {
        bookId: book1._id, chapterId: chaptersBook1[1]._id,
        title: 'The Photograph – Narrated',
        duration: 1680, narrator: 'Rahul Voiceover',
        isFree: false, coinCost: 15, listenCount: 410, status: 'published',
      },
      {
        bookId: book1._id, chapterId: chaptersBook1[2]._id,
        title: 'The Revelation – Narrated',
        duration: 1560, narrator: 'Rahul Voiceover',
        isFree: false, coinCost: 15, listenCount: 287, status: 'published',
      },
      // Fragments of Tomorrow
      {
        bookId: book2._id, chapterId: chaptersBook2[0]._id,
        title: 'The First Fragment – Narrated',
        duration: 1440, narrator: 'Kavya Nair',
        isFree: true, coinCost: 0, listenCount: 623, status: 'published',
      },
      {
        bookId: book2._id, chapterId: chaptersBook2[1]._id,
        title: 'Parallel Lines – Narrated',
        duration: 1200, narrator: 'Kavya Nair',
        isFree: false, coinCost: 20, listenCount: 298, status: 'published',
      },
      // The Mindful Entrepreneur
      {
        bookId: book4._id, chapterId: chaptersBook4[0]._id,
        title: 'The Mindful Foundation – Narrated',
        duration: 1800, narrator: 'Priya Sharma',
        isFree: true, coinCost: 0, listenCount: 1240, status: 'published',
      },
      {
        bookId: book4._id, chapterId: chaptersBook4[1]._id,
        title: 'Systems Over Hustle – Narrated',
        duration: 2100, narrator: 'Priya Sharma',
        isFree: false, coinCost: 20, listenCount: 760, status: 'published',
      },
      {
        bookId: book4._id, chapterId: chaptersBook4[2]._id,
        title: 'The Compound Effect of Stillness – Narrated',
        duration: 1920, narrator: 'Priya Sharma',
        isFree: false, coinCost: 20, listenCount: 544, status: 'published',
      },
      // Atomic Clarity
      {
        bookId: book5._id, chapterId: chaptersBook5[0]._id,
        title: 'The Clarity Problem – Narrated',
        duration: 1560, narrator: 'Dev Sharma',
        isFree: true, coinCost: 0, listenCount: 912, status: 'published',
      },
      {
        bookId: book5._id, chapterId: chaptersBook5[1]._id,
        title: 'Rewiring the Default – Narrated',
        duration: 1680, narrator: 'Dev Sharma',
        isFree: false, coinCost: 18, listenCount: 512, status: 'published',
      },
    ];
    await Audiobook.insertMany(audiobookData);
    console.log(`✅ ${audiobookData.length} Audiobook tracks created`);

    // ─── Podcast Series ───────────────────────────────────────

    // Series 1: Thinking Out Loud (Philosophy / Salil)
    const podcast1 = await PodcastSeries.create({
      title: 'Thinking Out Loud with Salil Javeri',
      description: 'A weekly podcast exploring ideas at the intersection of creativity, technology, and human experience. From consciousness to code, Salil unpacks big ideas for curious minds.',
      thumbnail: localImg('pod_thinking.png'),
      authorId: author1._id,
      categoryId: catPhilosophy._id,
      isPublished: true,
      isFeatured: true,
      totalEpisodes: 5,
      status: 'published',
    });

    await PodcastEpisode.insertMany([
      {
        seriesId: podcast1._id, episodeNumber: 1,
        title: 'Why Stories Are Technology',
        description: 'Storytelling is humanity\'s oldest and most powerful technology. Salil explores how narrative shaped civilization and why it still drives everything from politics to product design.',
        sourceType: 'youtube_link',
        youtubeUrl: 'https://www.youtube.com/watch?v=arj7oStGLkU',
        youtubeMeta: { videoId: 'arj7oStGLkU', thumbnailUrl: ytThumb('arj7oStGLkU'), channelName: 'Salil javeri', duration: 1980 },
        thumbnail: ytThumb('arj7oStGLkU'),
        duration: 1980, isFree: true, coinCost: 0, status: 'published', publishedAt: new Date('2024-12-01'), playCount: 3240,
      },
      {
        seriesId: podcast1._id, episodeNumber: 2,
        title: 'The Art of Deep Work',
        description: 'How to cultivate focus in a world of infinite distractions. Frameworks for meaningful creative output in the age of social media.',
        sourceType: 'youtube_link',
        youtubeUrl: 'https://www.youtube.com/watch?v=H14bBuluwB8',
        youtubeMeta: { videoId: 'H14bBuluwB8', thumbnailUrl: ytThumb('H14bBuluwB8'), channelName: 'Salil javeri', duration: 2460 },
        thumbnail: ytThumb('H14bBuluwB8'),
        duration: 2460, isFree: false, coinCost: 10, status: 'published', publishedAt: new Date('2024-12-08'), playCount: 2180,
      },
      {
        seriesId: podcast1._id, episodeNumber: 3,
        title: 'Consciousness, AI and the Hard Problem',
        description: 'What happens when machines start to think? Salil examines the philosophical frontiers of artificial intelligence and what it means for human identity.',
        sourceType: 'youtube_link',
        youtubeUrl: 'https://www.youtube.com/watch?v=8jPQjjsBbIc',
        youtubeMeta: { videoId: '8jPQjjsBbIc', thumbnailUrl: ytThumb('8jPQjjsBbIc'), channelName: 'Salil javeri', duration: 2880 },
        thumbnail: ytThumb('8jPQjjsBbIc'),
        duration: 2880, isFree: false, coinCost: 10, status: 'published', publishedAt: new Date('2024-12-15'), playCount: 1890,
      },
      {
        seriesId: podcast1._id, episodeNumber: 4,
        title: 'The Paradox of Choice',
        description: 'More options, less happiness. Barry Schwartz\'s paradox explains modern anxiety. Salil breaks it down and offers a framework for better decisions.',
        sourceType: 'youtube_link',
        youtubeUrl: 'https://www.youtube.com/watch?v=VO6XEQIsCoM',
        youtubeMeta: { videoId: 'VO6XEQIsCoM', thumbnailUrl: ytThumb('VO6XEQIsCoM'), channelName: 'Salil javeri', duration: 2160 },
        thumbnail: ytThumb('VO6XEQIsCoM'),
        duration: 2160, isFree: true, coinCost: 0, status: 'published', publishedAt: new Date('2024-12-22'), playCount: 2560,
      },
      {
        seriesId: podcast1._id, episodeNumber: 5,
        title: 'Letters to My Younger Self',
        description: 'A personal episode. Salil reads letters to himself at different life stages — honest, funny, and unexpectedly moving.',
        sourceType: 'youtube_link',
        youtubeUrl: 'https://www.youtube.com/watch?v=W7vFJqFwDv0',
        youtubeMeta: { videoId: 'W7vFJqFwDv0', thumbnailUrl: ytThumb('W7vFJqFwDv0'), channelName: 'Salil javeri', duration: 3120 },
        thumbnail: ytThumb('W7vFJqFwDv0'),
        duration: 3120, isFree: false, coinCost: 15, status: 'published', publishedAt: new Date('2024-12-29'), playCount: 1740,
      },
    ]);

    // Series 2: The Wellness Frequency (Wellness / Priya)
    const podcast2 = await PodcastSeries.create({
      title: 'The Wellness Frequency with Priya Sharma',
      description: 'Science-backed conversations about mental health, productivity, mindfulness, and living a balanced life. Practical tools, not platitudes.',
      thumbnail: localImg('pod_wellness.png'),
      authorId: author2._id,
      categoryId: catWellness._id,
      isPublished: true,
      isFeatured: true,
      totalEpisodes: 4,
      status: 'published',
    });

    await PodcastEpisode.insertMany([
      {
        seriesId: podcast2._id, episodeNumber: 1,
        title: 'The Science of Habit Formation',
        description: 'Why habits are hard to break, and the neuroscience-backed approach to forming new ones. With practical exercises you can start today.',
        sourceType: 'youtube_link',
        youtubeUrl: 'https://www.youtube.com/watch?v=PZ7lDrwYdZc',
        youtubeMeta: { videoId: 'PZ7lDrwYdZc', thumbnailUrl: ytThumb('PZ7lDrwYdZc'), channelName: 'Salil javeri', duration: 2220 },
        thumbnail: ytThumb('PZ7lDrwYdZc'),
        duration: 2220, isFree: true, coinCost: 0, status: 'published', publishedAt: new Date('2025-01-05'), playCount: 4120,
      },
      {
        seriesId: podcast2._id, episodeNumber: 2,
        title: 'Managing Anxiety in High-Performance Environments',
        description: 'High achievers are disproportionately affected by anxiety. Priya unpacks why and shares evidence-based interventions that actually work.',
        sourceType: 'youtube_link',
        youtubeUrl: 'https://www.youtube.com/watch?v=WWloIAQpMcQ',
        youtubeMeta: { videoId: 'WWloIAQpMcQ', thumbnailUrl: ytThumb('WWloIAQpMcQ'), channelName: 'Salil javeri', duration: 2640 },
        thumbnail: ytThumb('WWloIAQpMcQ'),
        duration: 2640, isFree: false, coinCost: 12, status: 'published', publishedAt: new Date('2025-01-12'), playCount: 3380,
      },
      {
        seriesId: podcast2._id, episodeNumber: 3,
        title: 'Sleep: The Ultimate Performance Hack',
        description: 'Matthew Walker\'s research shows sleep deprivation is cognitive suicide. Priya explores the habits and rituals that transform sleep quality.',
        sourceType: 'youtube_link',
        youtubeUrl: 'https://www.youtube.com/watch?v=5MuIMqhT8oM',
        youtubeMeta: { videoId: '5MuIMqhT8oM', thumbnailUrl: ytThumb('5MuIMqhT8oM'), channelName: 'Salil javeri', duration: 2820 },
        thumbnail: ytThumb('5MuIMqhT8oM'),
        duration: 2820, isFree: false, coinCost: 12, status: 'published', publishedAt: new Date('2025-01-19'), playCount: 2910,
      },
      {
        seriesId: podcast2._id, episodeNumber: 4,
        title: 'Digital Detox: Finding Silence in a Noisy World',
        description: 'We are drowning in notifications, content, and noise. Priya shares her 30-day digital detox experiment and the life-changing lessons it taught her.',
        sourceType: 'youtube_link',
        youtubeUrl: 'https://www.youtube.com/watch?v=T4RFuFcPgng',
        youtubeMeta: { videoId: 'T4RFuFcPgng', thumbnailUrl: ytThumb('T4RFuFcPgng'), channelName: 'Salil javeri', duration: 2400 },
        thumbnail: ytThumb('T4RFuFcPgng'),
        duration: 2400, isFree: true, coinCost: 0, status: 'published', publishedAt: new Date('2025-01-26'), playCount: 3760,
      },
    ]);

    // Series 3: Tech Decoded (Technology / Rohan)
    const podcast3 = await PodcastSeries.create({
      title: 'Tech Decoded with Rohan Kapoor',
      description: 'Demystifying technology for founders, creators, and curious minds. From AI to startups, Rohan breaks down what matters and what\'s just noise.',
      thumbnail: localImg('pod_tech.png'),
      authorId: author3._id,
      categoryId: catTech._id,
      isPublished: true,
      isFeatured: false,
      totalEpisodes: 4,
      status: 'published',
    });

    await PodcastEpisode.insertMany([
      {
        seriesId: podcast3._id, episodeNumber: 1,
        title: 'Understanding Large Language Models',
        description: 'What actually is a Large Language Model? How does GPT work? Rohan explains in plain English, without the hype or the fear.',
        sourceType: 'youtube_link',
        youtubeUrl: 'https://www.youtube.com/watch?v=zjkBMFhNj_g',
        youtubeMeta: { videoId: 'zjkBMFhNj_g', thumbnailUrl: ytThumb('zjkBMFhNj_g'), channelName: 'Salil javeri Tech', duration: 2580 },
        thumbnail: ytThumb('zjkBMFhNj_g'),
        duration: 2580, isFree: true, coinCost: 0, status: 'published', publishedAt: new Date('2025-02-01'), playCount: 5640,
      },
      {
        seriesId: podcast3._id, episodeNumber: 2,
        title: 'Building Your First SaaS in 30 Days',
        description: 'Rohan interviews a founder who launched a profitable SaaS in a single month. What they built, how they found customers, and what they wish they knew.',
        sourceType: 'youtube_link',
        youtubeUrl: 'https://www.youtube.com/watch?v=ysEN5RaKOlA',
        youtubeMeta: { videoId: 'ysEN5RaKOlA', thumbnailUrl: ytThumb('ysEN5RaKOlA'), channelName: 'Salil javeri Tech', duration: 3300 },
        thumbnail: ytThumb('ysEN5RaKOlA'),
        duration: 3300, isFree: false, coinCost: 15, status: 'published', publishedAt: new Date('2025-02-08'), playCount: 4280,
      },
      {
        seriesId: podcast3._id, episodeNumber: 3,
        title: 'The Future of Web3 — Hype vs. Reality',
        description: 'Two years after the crypto crash, what survived? Rohan separates the genuine use cases of blockchain from the noise, with a clear-eyed assessment.',
        sourceType: 'youtube_link',
        youtubeUrl: 'https://www.youtube.com/watch?v=M576WGiDBdQ',
        youtubeMeta: { videoId: 'M576WGiDBdQ', thumbnailUrl: ytThumb('M576WGiDBdQ'), channelName: 'Salil javeri Tech', duration: 2940 },
        thumbnail: ytThumb('M576WGiDBdQ'),
        duration: 2940, isFree: false, coinCost: 15, status: 'published', publishedAt: new Date('2025-02-15'), playCount: 3120,
      },
      {
        seriesId: podcast3._id, episodeNumber: 4,
        title: 'No-Code Revolution: Build Without Coding',
        description: 'You no longer need to write a single line of code to build a product. Rohan explores the best no-code tools, use cases, and the limits of the no-code paradigm.',
        sourceType: 'youtube_link',
        youtubeUrl: 'https://www.youtube.com/watch?v=YNfDyNEJYE8',
        youtubeMeta: { videoId: 'YNfDyNEJYE8', thumbnailUrl: ytThumb('YNfDyNEJYE8'), channelName: 'Salil javeri Tech', duration: 2700 },
        thumbnail: ytThumb('YNfDyNEJYE8'),
        duration: 2700, isFree: true, coinCost: 0, status: 'published', publishedAt: new Date('2025-02-22'), playCount: 3890,
      },
    ]);

    console.log('✅ 3 Podcast Series + 13 Episodes created');

    // ─── Video Series ─────────────────────────────────────────

    // Video Series 1: Python Masterclass (Rohan)
    const videoSeries1 = await VideoSeries.create({
      title: 'Python Masterclass: Zero to Hero',
      slug: 'python-masterclass-zero-to-hero',
      description: 'A comprehensive video course that takes you from complete beginner to confident Python developer. Includes real projects, best practices, and industry techniques.',
      thumbnail: img('python-masterclass', 640, 360),
      authorId: author3._id,
      categoryId: catTech._id,
      status: 'published',
      totalVideos: 5,
    });

    await Video.insertMany([
      {
        seriesId: videoSeries1._id, authorId: author3._id,
        title: 'Python Setup & Your First Program',
        description: 'Install Python, set up VS Code, and write your first program. We cover variables, data types, print statements, and basic input/output.',
        sourceType: 'youtube_link',
        youtubeUrl: 'https://www.youtube.com/watch?v=rfscVS0vtbw',
        youtubeMeta: { videoId: 'rfscVS0vtbw', thumbnailUrl: ytThumb('rfscVS0vtbw'), channelName: 'Salil javeri Learning', duration: 2700 },
        thumbnail: ytThumb('rfscVS0vtbw'),
        duration: 2700, isFree: true, coinCost: 0, status: 'published', publishedAt: new Date('2025-01-15'), viewCount: 8920,
      },
      {
        seriesId: videoSeries1._id, authorId: author3._id,
        title: 'Python Functions & Control Flow',
        description: 'Master if/else, for loops, while loops, and functions. Learn how to structure your code like a professional developer.',
        sourceType: 'youtube_link',
        youtubeUrl: 'https://www.youtube.com/watch?v=PkZNo7MFNFg',
        youtubeMeta: { videoId: 'PkZNo7MFNFg', thumbnailUrl: ytThumb('PkZNo7MFNFg'), channelName: 'Salil javeri Learning', duration: 3600 },
        thumbnail: ytThumb('PkZNo7MFNFg'),
        duration: 3600, isFree: false, coinCost: 20, status: 'published', publishedAt: new Date('2025-01-22'), viewCount: 6340,
      },
      {
        seriesId: videoSeries1._id, authorId: author3._id,
        title: 'Object-Oriented Python',
        description: 'Classes, objects, inheritance, and polymorphism explained clearly. Build a real project using OOP principles.',
        sourceType: 'youtube_link',
        youtubeUrl: 'https://www.youtube.com/watch?v=Ke90Tje7VS0',
        youtubeMeta: { videoId: 'Ke90Tje7VS0', thumbnailUrl: ytThumb('Ke90Tje7VS0'), channelName: 'Salil javeri Learning', duration: 4200 },
        thumbnail: ytThumb('Ke90Tje7VS0'),
        duration: 4200, isFree: false, coinCost: 25, status: 'published', publishedAt: new Date('2025-01-29'), viewCount: 5180,
      },
      {
        seriesId: videoSeries1._id, authorId: author3._id,
        title: 'Python APIs & Web Scraping',
        description: 'Fetch data from real APIs, handle JSON, and scrape websites with BeautifulSoup. Build a practical project using live data.',
        sourceType: 'youtube_link',
        youtubeUrl: 'https://www.youtube.com/watch?v=SqvVm3QiQVk',
        youtubeMeta: { videoId: 'SqvVm3QiQVk', thumbnailUrl: ytThumb('SqvVm3QiQVk'), channelName: 'Salil javeri Learning', duration: 3900 },
        thumbnail: ytThumb('SqvVm3QiQVk'),
        duration: 3900, isFree: false, coinCost: 25, status: 'published', publishedAt: new Date('2025-02-05'), viewCount: 4760,
      },
      {
        seriesId: videoSeries1._id, authorId: author3._id,
        title: 'Build a Full Python Project',
        description: 'Put it all together: build a complete personal finance tracker with CSV export, API integration, and a clean CLI interface.',
        sourceType: 'youtube_link',
        youtubeUrl: 'https://www.youtube.com/watch?v=_uQrJ0TkZlc',
        youtubeMeta: { videoId: '_uQrJ0TkZlc', thumbnailUrl: ytThumb('_uQrJ0TkZlc'), channelName: 'Salil javeri Learning', duration: 5400 },
        thumbnail: ytThumb('_uQrJ0TkZlc'),
        duration: 5400, isFree: false, coinCost: 30, status: 'published', publishedAt: new Date('2025-02-12'), viewCount: 4230,
      },
    ]);

    // Video Series 2: Mindset Mastery (Priya)
    const videoSeries2 = await VideoSeries.create({
      title: 'Mindset Mastery: Rewire Your Brain for Success',
      slug: 'mindset-mastery-rewire-your-brain',
      description: 'A 4-part video series combining neuroscience, psychology, and practical tools to help you break limiting beliefs and build the mindset of a high performer.',
      thumbnail: img('mindset-mastery', 640, 360),
      authorId: author2._id,
      categoryId: catSelfHelp._id,
      status: 'published',
      totalVideos: 4,
    });

    await Video.insertMany([
      {
        seriesId: videoSeries2._id, authorId: author2._id,
        title: 'Understanding Your Default Mindset',
        description: 'What is your baseline mindset? Take Priya\'s diagnostic quiz, understand your patterns, and see the map of changes ahead.',
        sourceType: 'youtube_link',
        youtubeUrl: 'https://www.youtube.com/watch?v=yGLGnJUFotk',
        youtubeMeta: { videoId: 'yGLGnJUFotk', thumbnailUrl: ytThumb('yGLGnJUFotk'), channelName: 'Salil javeri Wellness', duration: 2400 },
        thumbnail: ytThumb('yGLGnJUFotk'),
        duration: 2400, isFree: true, coinCost: 0, status: 'published', publishedAt: new Date('2025-02-10'), viewCount: 7680,
      },
      {
        seriesId: videoSeries2._id, authorId: author2._id,
        title: 'Breaking the Victim Loop',
        description: 'The victim loop keeps millions stuck. Priya breaks down the neuroscience of self-blame and the exact cognitive reframes that interrupt the pattern.',
        sourceType: 'youtube_link',
        youtubeUrl: 'https://www.youtube.com/watch?v=H14bBuluwB8',
        youtubeMeta: { videoId: 'H14bBuluwB8', thumbnailUrl: ytThumb('H14bBuluwB8'), channelName: 'Salil javeri Wellness', duration: 2700 },
        thumbnail: ytThumb('H14bBuluwB8'),
        duration: 2700, isFree: false, coinCost: 20, status: 'published', publishedAt: new Date('2025-02-17'), viewCount: 5940,
      },
      {
        seriesId: videoSeries2._id, authorId: author2._id,
        title: 'Installing the Growth Identity',
        description: 'Identity change is the highest leverage point for behavioral change. Learn how to consciously redesign who you believe yourself to be.',
        sourceType: 'youtube_link',
        youtubeUrl: 'https://www.youtube.com/watch?v=iG9CE55wbtY',
        youtubeMeta: { videoId: 'iG9CE55wbtY', thumbnailUrl: ytThumb('iG9CE55wbtY'), channelName: 'Salil javeri Wellness', duration: 2880 },
        thumbnail: ytThumb('iG9CE55wbtY'),
        duration: 2880, isFree: false, coinCost: 20, status: 'published', publishedAt: new Date('2025-02-24'), viewCount: 5200,
      },
      {
        seriesId: videoSeries2._id, authorId: author2._id,
        title: 'Sustaining the New You: 90-Day Protocol',
        description: 'Change without reinforcement reverts. Priya\'s 90-day protocol turns your new mindset into bedrock identity through deliberate practice and environmental design.',
        sourceType: 'youtube_link',
        youtubeUrl: 'https://www.youtube.com/watch?v=zqdfFdUe964',
        youtubeMeta: { videoId: 'zqdfFdUe964', thumbnailUrl: ytThumb('zqdfFdUe964'), channelName: 'Salil javeri Wellness', duration: 3240 },
        thumbnail: ytThumb('zqdfFdUe964'),
        duration: 3240, isFree: false, coinCost: 25, status: 'published', publishedAt: new Date('2025-03-03'), viewCount: 4810,
      },
    ]);

    console.log('✅ 2 Video Series + 9 Series Videos created');

    // ─── Standalone Videos ────────────────────────────────────
    await Video.insertMany([
      {
        authorId: author1._id,
        title: 'How Great Writers Think: Inside the Creative Process',
        description: 'Salil pulls back the curtain on how he writes — from first idea to final draft. Includes his actual writing routine, tools, and the mindset behind every story.',
        sourceType: 'youtube_link',
        youtubeUrl: 'https://www.youtube.com/watch?v=9YUr7wRN0os',
        youtubeMeta: { videoId: '9YUr7wRN0os', thumbnailUrl: ytThumb('9YUr7wRN0os'), channelName: 'Salil javeri', duration: 2700 },
        thumbnail: ytThumb('9YUr7wRN0os'),
        duration: 2700, isFree: true, coinCost: 0, status: 'published', publishedAt: new Date('2025-01-20'), viewCount: 12400,
      },
      {
        authorId: author2._id,
        title: '5-Minute Morning Meditation for Clarity',
        description: 'Start your day with intention. This guided meditation is designed for busy professionals who need focus and calm before the chaos begins.',
        sourceType: 'youtube_link',
        youtubeUrl: 'https://www.youtube.com/watch?v=inpok4MKVLM',
        youtubeMeta: { videoId: 'inpok4MKVLM', thumbnailUrl: ytThumb('inpok4MKVLM'), channelName: 'Salil javeri Wellness', duration: 360 },
        thumbnail: ytThumb('inpok4MKVLM'),
        duration: 360, isFree: true, coinCost: 0, status: 'published', publishedAt: new Date('2025-02-03'), viewCount: 19800,
      },
      {
        authorId: author3._id,
        title: 'ChatGPT for Developers: Beyond the Basics',
        description: 'Stop using ChatGPT as a search engine. Rohan shows advanced prompting techniques, API integration patterns, and real productivity workflows.',
        sourceType: 'youtube_link',
        youtubeUrl: 'https://www.youtube.com/watch?v=sTeoEFzVNSc',
        youtubeMeta: { videoId: 'sTeoEFzVNSc', thumbnailUrl: ytThumb('sTeoEFzVNSc'), channelName: 'Salil javeri Tech', duration: 3300 },
        thumbnail: ytThumb('sTeoEFzVNSc'),
        duration: 3300, isFree: true, coinCost: 0, status: 'published', publishedAt: new Date('2025-02-14'), viewCount: 28600,
      },
      {
        authorId: author2._id,
        title: 'The Neuroscience of Motivation',
        description: 'Why does motivation disappear? What actually drives sustained action? Priya explains dopamine, the reward circuit, and how to hack your brain for consistent drive.',
        sourceType: 'youtube_link',
        youtubeUrl: 'https://www.youtube.com/watch?v=SKDIQnhAqAk',
        youtubeMeta: { videoId: 'SKDIQnhAqAk', thumbnailUrl: ytThumb('SKDIQnhAqAk'), channelName: 'Salil javeri Wellness', duration: 2940 },
        thumbnail: ytThumb('SKDIQnhAqAk'),
        duration: 2940, isFree: false, coinCost: 15, status: 'published', publishedAt: new Date('2025-02-28'), viewCount: 9340,
      },
      {
        authorId: author1._id,
        title: 'Stoicism for the Modern World',
        description: 'Marcus Aurelius, Seneca, and Epictetus wrote 2,000 years ago. Their wisdom has never been more relevant. Salil unpacks the core ideas of Stoicism and how to live them.',
        sourceType: 'youtube_link',
        youtubeUrl: 'https://www.youtube.com/watch?v=R9OCA6UFE-0',
        youtubeMeta: { videoId: 'R9OCA6UFE-0', thumbnailUrl: ytThumb('R9OCA6UFE-0'), channelName: 'Salil javeri', duration: 3180 },
        thumbnail: ytThumb('R9OCA6UFE-0'),
        duration: 3180, isFree: false, coinCost: 15, status: 'published', publishedAt: new Date('2025-03-05'), viewCount: 7820,
      },
      {
        authorId: author3._id,
        title: 'From Idea to App in One Weekend',
        description: 'Rohan live-builds a complete mobile app in 48 hours — from napkin sketch to App Store ready. Watch the entire process, mistakes and all.',
        sourceType: 'youtube_link',
        youtubeUrl: 'https://www.youtube.com/watch?v=0-S5a0eXPoc',
        youtubeMeta: { videoId: '0-S5a0eXPoc', thumbnailUrl: ytThumb('0-S5a0eXPoc'), channelName: 'Salil javeri Tech', duration: 7200 },
        thumbnail: ytThumb('0-S5a0eXPoc'),
        duration: 7200, isFree: false, coinCost: 30, status: 'published', publishedAt: new Date('2025-03-10'), viewCount: 15600,
      },
    ]);
    console.log('✅ 6 Standalone Videos created');

    // ─── Banners ──────────────────────────────────────────────
    const now = new Date();
    const endDate = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());

    await Banner.insertMany([
      {
        title: '🔥 Trending Now: The Silent Observer',
        imageUrl: localImg('banner_silent.png'),
        linkType: 'book',
        linkId: book1._id,
        priority: 10,
        targetSegment: 'all',
        startDate: now,
        endDate,
        isActive: true,
      },
      {
        title: '🎙️ New Podcast: Thinking Out Loud',
        imageUrl: localImg('banner_podcast.png'),
        linkType: 'none',
        priority: 9,
        targetSegment: 'all',
        startDate: now,
        endDate,
        isActive: true,
      },
      {
        title: '💻 Learn Python — Free First Lesson',
        imageUrl: localImg('banner_python.png'),
        linkType: 'none',
        priority: 8,
        targetSegment: 'all',
        startDate: now,
        endDate,
        isActive: true,
      },
      {
        title: '✨ The Mindful Entrepreneur — #1 Bestseller',
        imageUrl: localImg('banner_mindful.png'),
        linkType: 'book',
        linkId: book4._id,
        priority: 7,
        targetSegment: 'all',
        startDate: now,
        endDate,
        isActive: true,
      },
      {
        title: '🎁 New Users: 50 Free Coins on Signup',
        imageUrl: localImg('banner_coins.png'),
        linkType: 'coin_pack',
        priority: 6,
        targetSegment: 'new_users',
        startDate: now,
        endDate,
        isActive: true,
      },
    ]);
    console.log('✅ 5 Banners created');

    // ─── Summary ──────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('   📚  Salil javeri Database Seeded Successfully');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  Accounts:');
    console.log('    Super Admin:  admin@saliljaveri.com / admin123456');
    console.log('    Author 1:     salil@saliljaveri.com / author123456');
    console.log('    Author 2:     priya@saliljaveri.com / author123456');
    console.log('    Author 3:     rohan@saliljaveri.com / author123456');
    console.log('    Reader:       reader@saliljaveri.com / reader123456 (500 coins)');
    console.log('');
    console.log('  Content:');
    console.log('    📖  5 Books  (13 chapters)');
    console.log('    🎵  10 Audiobook tracks');
    console.log('    🎙️  3 Podcast Series  (13 episodes)');
    console.log('    🎬  2 Video Series  (9 videos)');
    console.log('    📹  6 Standalone Videos');
    console.log('    🖼️  5 Banners');
    console.log('    🏷️  10 Categories  |  8 Tags  |  5 Coin Packs');
    console.log('═══════════════════════════════════════════════════════════\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seed();
