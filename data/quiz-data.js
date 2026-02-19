// Quiz Questions Data (lazy loaded)
window.QUIZ_QUESTIONS_DATA = [
    // ---- People ----
    { category: 'People', q: 'Who built the ark?', options: ['Moses', 'Noah', 'Abraham', 'David'], answer: 1, ref: 'Genesis 6:13-14' },
    { category: 'People', q: 'Who was the first king of Israel?', options: ['David', 'Solomon', 'Saul', 'Samuel'], answer: 2, ref: '1 Samuel 10:1' },
    { category: 'People', q: 'Who was thrown into a den of lions?', options: ['David', 'Daniel', 'Elijah', 'Jonah'], answer: 1, ref: 'Daniel 6:16' },
    { category: 'People', q: 'Who was swallowed by a great fish?', options: ['Peter', 'Jonah', 'Paul', 'Moses'], answer: 1, ref: 'Jonah 1:17' },
    { category: 'People', q: 'Who killed Goliath?', options: ['Saul', 'Jonathan', 'David', 'Joshua'], answer: 2, ref: '1 Samuel 17:50' },
    { category: 'People', q: 'Who betrayed Jesus for thirty pieces of silver?', options: ['Peter', 'Thomas', 'Judas Iscariot', 'James'], answer: 2, ref: 'Matthew 26:14-15' },
    { category: 'People', q: 'Who was the mother of Jesus?', options: ['Martha', 'Mary Magdalene', 'Elizabeth', 'Mary'], answer: 3, ref: 'Luke 1:30-31' },
    { category: 'People', q: 'Who denied Jesus three times?', options: ['John', 'Peter', 'Thomas', 'Andrew'], answer: 1, ref: 'Luke 22:61' },
    { category: 'People', q: 'Who led the Israelites out of Egypt?', options: ['Aaron', 'Joshua', 'Moses', 'Joseph'], answer: 2, ref: 'Exodus 3:10' },
    { category: 'People', q: 'Who was known as the wisest man?', options: ['David', 'Solomon', 'Daniel', 'Moses'], answer: 1, ref: '1 Kings 4:30' },
    { category: 'People', q: 'Who was the wife of Abraham?', options: ['Rebekah', 'Rachel', 'Sarah', 'Leah'], answer: 2, ref: 'Genesis 17:15' },
    { category: 'People', q: 'Who was sold into slavery by his brothers?', options: ['Benjamin', 'Reuben', 'Joseph', 'Judah'], answer: 2, ref: 'Genesis 37:28' },
    { category: 'People', q: 'Who wrote most of the Psalms?', options: ['Solomon', 'Moses', 'David', 'Asaph'], answer: 2, ref: 'Psalm 72:20' },
    { category: 'People', q: 'Who was the first person to see the risen Jesus?', options: ['Peter', 'Mary Magdalene', 'John', 'Thomas'], answer: 1, ref: 'Mark 16:9' },
    { category: 'People', q: 'Who baptized Jesus?', options: ['Peter', 'John the Baptist', 'Andrew', 'James'], answer: 1, ref: 'Matthew 3:13' },

    // ---- Events ----
    { category: 'Events', q: 'How many days did it rain during the great flood?', options: ['7', '30', '40', '100'], answer: 2, ref: 'Genesis 7:12' },
    { category: 'Events', q: 'How many plagues did God send on Egypt?', options: ['5', '7', '10', '12'], answer: 2, ref: 'Exodus 7-12' },
    { category: 'Events', q: 'What did God create on the first day?', options: ['Land and sea', 'Light', 'Animals', 'Stars'], answer: 1, ref: 'Genesis 1:3' },
    { category: 'Events', q: 'Which sea did Moses part?', options: ['Dead Sea', 'Red Sea', 'Sea of Galilee', 'Mediterranean Sea'], answer: 1, ref: 'Exodus 14:21' },
    { category: 'Events', q: 'What fell from the sky to feed the Israelites?', options: ['Bread', 'Manna', 'Fruit', 'Fish'], answer: 1, ref: 'Exodus 16:14-15' },
    { category: 'Events', q: 'How many days was Jesus in the wilderness being tempted?', options: ['7', '21', '30', '40'], answer: 3, ref: 'Matthew 4:1-2' },
    { category: 'Events', q: 'At the wedding in Cana, Jesus turned water into what?', options: ['Milk', 'Oil', 'Wine', 'Honey'], answer: 2, ref: 'John 2:9' },
    { category: 'Events', q: 'How many loaves did Jesus use to feed the 5,000?', options: ['3', '5', '7', '12'], answer: 1, ref: 'Matthew 14:17-21' },
    { category: 'Events', q: 'What happened on the day of Pentecost?', options: ['An earthquake', 'The Holy Spirit came', 'Jesus ascended', 'The temple was destroyed'], answer: 1, ref: 'Acts 2:1-4' },
    { category: 'Events', q: 'How did Jesus enter Jerusalem before his crucifixion?', options: ['On a horse', 'On a donkey', 'On foot', 'In a chariot'], answer: 1, ref: 'Matthew 21:7' },

    // ---- Places ----
    { category: 'Places', q: 'In which city was Jesus born?', options: ['Nazareth', 'Jerusalem', 'Bethlehem', 'Capernaum'], answer: 2, ref: 'Matthew 2:1' },
    { category: 'Places', q: 'Where did God give Moses the Ten Commandments?', options: ['Mount Sinai', 'Mount Zion', 'Mount Carmel', 'Mount Nebo'], answer: 0, ref: 'Exodus 19:20' },
    { category: 'Places', q: 'What was the name of the garden where Adam and Eve lived?', options: ['Gethsemane', 'Eden', 'Galilee', 'Canaan'], answer: 1, ref: 'Genesis 2:8' },
    { category: 'Places', q: 'On what mountain did Noah\'s ark come to rest?', options: ['Mount Sinai', 'Mount Ararat', 'Mount Carmel', 'Mount Nebo'], answer: 1, ref: 'Genesis 8:4' },
    { category: 'Places', q: 'Where was Paul on the road to when he saw a blinding light?', options: ['Jerusalem', 'Damascus', 'Athens', 'Rome'], answer: 1, ref: 'Acts 9:3' },

    // ---- Books & Scripture ----
    { category: 'Scripture', q: 'What is the shortest verse in the Bible?', options: ['"Jesus wept."', '"God is love."', '"Pray continually."', '"Rejoice always."'], answer: 0, ref: 'John 11:35' },
    { category: 'Scripture', q: 'How many books are in the Bible?', options: ['27', '39', '66', '73'], answer: 2, ref: '' },
    { category: 'Scripture', q: 'What is the first book of the Bible?', options: ['Exodus', 'Psalms', 'Genesis', 'Matthew'], answer: 2, ref: '' },
    { category: 'Scripture', q: 'What is the last book of the Bible?', options: ['Jude', 'Revelation', 'Malachi', 'Acts'], answer: 1, ref: '' },
    { category: 'Scripture', q: 'Which book contains the Ten Commandments?', options: ['Genesis', 'Leviticus', 'Exodus', 'Deuteronomy'], answer: 2, ref: 'Exodus 20:1-17' },
    { category: 'Scripture', q: 'How many Psalms are in the Bible?', options: ['50', '100', '119', '150'], answer: 3, ref: '' },
    { category: 'Scripture', q: '"For God so loved the world..." is found in which book?', options: ['Romans', 'Matthew', 'John', 'Luke'], answer: 2, ref: 'John 3:16' },
    { category: 'Scripture', q: 'Which book tells the story of the Exodus from Egypt?', options: ['Genesis', 'Exodus', 'Numbers', 'Leviticus'], answer: 1, ref: '' },
    { category: 'Scripture', q: 'The Sermon on the Mount is found in which Gospel?', options: ['Mark', 'Luke', 'John', 'Matthew'], answer: 3, ref: 'Matthew 5-7' },
    { category: 'Scripture', q: 'Who wrote the book of Acts?', options: ['Paul', 'Peter', 'Luke', 'John'], answer: 2, ref: 'Acts 1:1' },

    // ---- Teachings ----
    { category: 'Teachings', q: 'How many commandments did God give Moses?', options: ['5', '7', '10', '12'], answer: 2, ref: 'Exodus 34:28' },
    { category: 'Teachings', q: 'How many disciples did Jesus choose?', options: ['7', '10', '12', '70'], answer: 2, ref: 'Luke 6:13' },
    { category: 'Teachings', q: 'Which is the greatest commandment according to Jesus?', options: ['Do not steal', 'Honor your parents', 'Love the Lord your God', 'Do not kill'], answer: 2, ref: 'Matthew 22:37-38' },
    { category: 'Teachings', q: 'What are the fruits of the Spirit?', options: ['Faith, hope, charity', 'Love, joy, peace...', 'Wisdom, knowledge, truth', 'Grace, mercy, power'], answer: 1, ref: 'Galatians 5:22-23' },
    { category: 'Teachings', q: 'In the parable, what did the prodigal son spend his inheritance on?', options: ['Land', 'Wild living', 'Charity', 'Business'], answer: 1, ref: 'Luke 15:13' },
    { category: 'Teachings', q: 'What does Jesus say is the second greatest commandment?', options: ['Keep the Sabbath', 'Love your neighbor as yourself', 'Do not lie', 'Honor your parents'], answer: 1, ref: 'Matthew 22:39' },
    { category: 'Teachings', q: 'How many beatitudes did Jesus teach?', options: ['5', '7', '8', '10'], answer: 2, ref: 'Matthew 5:3-12' },
    { category: 'Teachings', q: 'What did Jesus say to do when someone strikes your right cheek?', options: ['Strike back', 'Turn the other cheek', 'Run away', 'Call for help'], answer: 1, ref: 'Matthew 5:39' },

    // ---- Miracles ----
    { category: 'Miracles', q: 'Who did Jesus raise from the dead after four days?', options: ['Jairus\u2019 daughter', 'Lazarus', 'Tabitha', 'Eutychus'], answer: 1, ref: 'John 11:43-44' },
    { category: 'Miracles', q: 'How many people did Jesus feed with five loaves and two fish?', options: ['3,000', '4,000', '5,000', '10,000'], answer: 2, ref: 'Matthew 14:21' },
    { category: 'Miracles', q: 'What happened when Jesus touched the eyes of the blind man?', options: ['Nothing', 'He could see', 'He fell asleep', 'He cried'], answer: 1, ref: 'Matthew 9:29-30' },
    { category: 'Miracles', q: 'Jesus calmed a storm on which body of water?', options: ['Jordan River', 'Red Sea', 'Sea of Galilee', 'Dead Sea'], answer: 2, ref: 'Mark 4:39' },
    { category: 'Miracles', q: 'Which disciple walked on water with Jesus?', options: ['John', 'James', 'Andrew', 'Peter'], answer: 3, ref: 'Matthew 14:29' },
];
];
