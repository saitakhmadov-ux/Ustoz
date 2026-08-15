// IELTS mashq topshiriqlari banki (seed uchun ma'lumot).
//
// Barcha savol va matnlar shu yerda — UI komponentlari ichida emas.
// Har biriga barqaror `code` berilgan: seed shu kod bo'yicha yetishmayotganini
// qo'shadi va mavjudini QAYTA YOZMAYDI (admin tahriri saqlanib qoladi).
//
// Matnlar IELTS uslubida, ammo original yozilgan — rasmiy imtihon
// materiallaridan ko'chirilmagan.
//
// Diagramma ma'lumoti `chartData` da saqlanadi va sayt uni SVG bilan chizadi.
// `dataSummary` — inglizcha qisqa tavsif: AI baholashda kontekst, rasm uchun
// esa alt matn bo'lib xizmat qiladi.

const T1_PROMPT = 'You should spend about 20 minutes on this task. Summarise the '
  + 'information by selecting and reporting the main features, and make comparisons '
  + 'where relevant. Write at least 150 words.';

const T2_TAIL = 'Give reasons for your answer and include any relevant examples from '
  + 'your own knowledge or experience. Write at least 250 words.';

/* ---------------- Academic Writing Task 1 (10 ta) ---------------- */

const ACADEMIC_T1 = [
  {
    code: 'AC-T1-01',
    subtype: 'Line Graph',
    title: 'Internet foydalanuvchilari (3 mamlakat)',
    visual: 'LINE',
    prompt: `The graph below shows the percentage of people using the internet in three countries between 2000 and 2020.\n\n${T1_PROMPT}`,
    dataSummary: 'Internet usage (% of population) in Canada, Mexico and Nigeria from 2000 to 2020, measured every five years.',
    chartData: {
      unit: '%',
      caption: 'Internet users (% of population), 2000–2020',
      labels: ['2000', '2005', '2010', '2015', '2020'],
      series: [
        { name: 'Canada', values: [51, 72, 80, 90, 94] },
        { name: 'Mexico', values: [5, 17, 31, 57, 72] },
        { name: 'Nigeria', values: [1, 4, 11, 26, 43] },
      ],
    },
  },
  {
    code: 'AC-T1-02',
    subtype: 'Line Graph',
    title: "Ikki shaharda yog'ingarchilik",
    visual: 'LINE',
    prompt: `The graph below shows the average monthly rainfall in two cities over one year.\n\n${T1_PROMPT}`,
    dataSummary: 'Average monthly rainfall in millimetres for Riverton and Lakeside across twelve months.',
    chartData: {
      unit: 'mm',
      caption: 'Average monthly rainfall (mm)',
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      series: [
        { name: 'Riverton', values: [95, 88, 70, 45, 30, 15, 10, 12, 28, 55, 80, 100] },
        { name: 'Lakeside', values: [20, 25, 40, 65, 90, 110, 120, 115, 85, 55, 30, 22] },
      ],
    },
  },
  {
    code: 'AC-T1-03',
    subtype: 'Line Graph',
    title: "Uy xo'jaligida elektr sarfi",
    visual: 'LINE',
    prompt: `The graph below shows average household electricity consumption in one country between 2010 and 2022.\n\n${T1_PROMPT}`,
    dataSummary: 'Average household electricity consumption in kWh per month, split between heating and appliances, 2010 to 2022.',
    chartData: {
      unit: 'kWh',
      caption: 'Average household electricity use per month (kWh)',
      labels: ['2010', '2013', '2016', '2019', '2022'],
      series: [
        { name: 'Heating', values: [320, 300, 265, 240, 205] },
        { name: 'Appliances', values: [180, 210, 245, 280, 310] },
      ],
    },
  },
  {
    code: 'AC-T1-04',
    subtype: 'Bar Chart',
    title: 'Mintaqalar bo\'yicha telefon sotuvi',
    visual: 'BAR',
    prompt: `The chart below shows smartphone sales in four regions in 2015 and 2022.\n\n${T1_PROMPT}`,
    dataSummary: 'Smartphone sales in millions of units in Europe, Asia, Africa and South America in 2015 and 2022.',
    chartData: {
      unit: 'mln',
      caption: 'Smartphone sales (millions of units)',
      labels: ['Europe', 'Asia', 'Africa', 'South America'],
      series: [
        { name: '2015', values: [210, 480, 95, 130] },
        { name: '2022', values: [185, 690, 240, 175] },
      ],
    },
  },
  {
    code: 'AC-T1-05',
    subtype: 'Bar Chart',
    title: 'Fan tanlovi (o\'g\'il/qiz)',
    visual: 'BAR',
    prompt: `The chart below shows the percentage of male and female students choosing five university subjects in one country.\n\n${T1_PROMPT}`,
    dataSummary: 'Percentage of male and female university students choosing Engineering, Medicine, Education, Business and Art.',
    chartData: {
      unit: '%',
      caption: 'University subject choice by gender (%)',
      labels: ['Engineering', 'Medicine', 'Education', 'Business', 'Art'],
      series: [
        { name: 'Male', values: [72, 45, 22, 58, 35] },
        { name: 'Female', values: [28, 55, 78, 42, 65] },
      ],
    },
  },
  {
    code: 'AC-T1-06',
    subtype: 'Pie Chart',
    title: 'Oila xarajatlari (2000 va 2020)',
    visual: 'PIE',
    prompt: `The pie charts below show household spending in one country in 2000 and 2020.\n\n${T1_PROMPT}`,
    dataSummary: 'Household spending by category (housing, food, transport, leisure, other) as a percentage in 2000 and 2020.',
    chartData: {
      unit: '%',
      caption: 'Household spending by category (%)',
      labels: ['Housing', 'Food', 'Transport', 'Leisure', 'Other'],
      series: [
        { name: '2000', values: [25, 30, 15, 12, 18] },
        { name: '2020', values: [34, 21, 17, 18, 10] },
      ],
    },
  },
  {
    code: 'AC-T1-07',
    subtype: 'Pie Chart',
    title: 'Energiya manbalari',
    visual: 'PIE',
    prompt: `The pie chart below shows the sources of electricity generation in one country in 2022.\n\n${T1_PROMPT}`,
    dataSummary: 'Electricity generation by source in 2022: gas, coal, hydro, wind and solar, nuclear.',
    chartData: {
      unit: '%',
      caption: 'Electricity generation by source, 2022 (%)',
      labels: ['Gas', 'Coal', 'Hydro', 'Wind and solar', 'Nuclear'],
      series: [{ name: '2022', values: [38, 22, 15, 17, 8] }],
    },
  },
  {
    code: 'AC-T1-08',
    subtype: 'Table',
    title: 'Sayyohlar oqimi (5 mamlakat)',
    visual: 'TABLE',
    prompt: `The table below shows the number of international tourist arrivals in five countries between 2018 and 2022.\n\n${T1_PROMPT}`,
    dataSummary: 'International tourist arrivals in millions for Spain, Turkey, Thailand, Egypt and Georgia in 2018, 2020 and 2022.',
    chartData: {
      unit: 'mln',
      caption: 'International tourist arrivals (millions)',
      labels: ['Spain', 'Turkey', 'Thailand', 'Egypt', 'Georgia'],
      series: [
        { name: '2018', values: [82.8, 45.8, 38.2, 11.3, 4.7] },
        { name: '2020', values: [18.9, 15.9, 6.7, 3.7, 1.5] },
        { name: '2022', values: [71.7, 50.5, 11.2, 11.7, 4.7] },
      ],
    },
  },
  {
    code: 'AC-T1-09',
    subtype: 'Process',
    title: "Qog'ozni qayta ishlash jarayoni",
    visual: 'PROCESS',
    // imageUrl bo'sh — admin panel orqali sxema rasmi yuklanadi
    prompt: `The diagram below shows how waste paper is recycled.\n\n${T1_PROMPT}`,
    dataSummary: 'A seven-stage process: paper collection, sorting, shredding, pulping, cleaning and de-inking, pressing and drying, and finally new paper rolls.',
  },
  {
    code: 'AC-T1-10',
    subtype: 'Map',
    title: "Shahar markazidagi o'zgarishlar",
    visual: 'MAP',
    prompt: `The maps below show the centre of a small town in 1990 and today.\n\n${T1_PROMPT}`,
    dataSummary: 'In 1990 the town centre had a market square, a small school and farmland to the north. Today the farmland has become a car park and apartment blocks, the school has been extended, and the market square is now a pedestrian area with a shopping centre.',
  },
];

/* ---------------- General Training Task 1 — xatlar (10 ta) ---------------- */

const GT_TAIL = 'You should spend about 20 minutes on this task. Write at least 150 '
  + 'words. You do NOT need to write any addresses.';

const GENERAL_T1 = [
  {
    code: 'GT-T1-01',
    subtype: 'Formal Letter',
    title: 'Nuqsonli mahsulot haqida shikoyat',
    prompt: `You recently bought a piece of electronic equipment online, but it stopped working after two weeks.\n\nWrite a letter to the company. In your letter:\n- explain what you bought and when\n- describe the problem\n- say what you would like the company to do\n\n${GT_TAIL}\n\nBegin your letter as follows:\nDear Sir or Madam,`,
  },
  {
    code: 'GT-T1-02',
    subtype: 'Formal Letter',
    title: "Ishdan ta'til so'rash",
    prompt: `You need to take two weeks off work for a family reason.\n\nWrite a letter to your manager. In your letter:\n- explain why you need the time off\n- say when you would like to take it\n- suggest how your work could be covered\n\n${GT_TAIL}\n\nBegin your letter as follows:\nDear Mr Roberts,`,
  },
  {
    code: 'GT-T1-03',
    subtype: 'Formal Letter',
    title: 'Kurs haqida ma\'lumot so\'rash',
    prompt: `You have seen an advertisement for an evening language course at a local college.\n\nWrite a letter to the college. In your letter:\n- explain which course you are interested in\n- ask about the timetable and the cost\n- ask what qualifications you need to join\n\n${GT_TAIL}\n\nBegin your letter as follows:\nDear Sir or Madam,`,
  },
  {
    code: 'GT-T1-04',
    subtype: 'Formal Letter',
    title: 'Pulni qaytarishni so\'rash',
    prompt: `You booked a hotel room for three nights, but the room was not as described on the website.\n\nWrite a letter to the hotel manager. In your letter:\n- give the details of your booking\n- explain what was wrong with the room\n- say what compensation you expect\n\n${GT_TAIL}\n\nBegin your letter as follows:\nDear Sir or Madam,`,
  },
  {
    code: 'GT-T1-05',
    subtype: 'Semi-formal Letter',
    title: 'Uy egasiga ta\'mirlash haqida',
    prompt: `The heating system in the flat you rent has stopped working.\n\nWrite a letter to your landlord. In your letter:\n- describe the problem\n- explain how it is affecting you\n- say what you would like the landlord to do and when\n\n${GT_TAIL}\n\nBegin your letter as follows:\nDear Mrs Khan,`,
  },
  {
    code: 'GT-T1-06',
    subtype: 'Semi-formal Letter',
    title: 'Qo\'shniga uzr xati',
    prompt: `You had a party at your home last weekend and it disturbed your neighbour.\n\nWrite a letter to your neighbour. In your letter:\n- apologise for the noise\n- explain why you had the party\n- suggest how you will avoid the problem in the future\n\n${GT_TAIL}\n\nBegin your letter as follows:\nDear Mr Ali,`,
  },
  {
    code: 'GT-T1-07',
    subtype: 'Semi-formal Letter',
    title: 'Yarim kunlik ish uchun ariza',
    prompt: `You have seen an advertisement for a part-time job at a bookshop near your home.\n\nWrite a letter to the shop owner. In your letter:\n- explain why you are interested in the job\n- describe your relevant experience\n- say when you would be available to work\n\n${GT_TAIL}\n\nBegin your letter as follows:\nDear Ms Bell,`,
  },
  {
    code: 'GT-T1-08',
    subtype: 'Informal Letter',
    title: 'Do\'stni tashrifga taklif qilish',
    prompt: `A friend from another country is going to visit your city next month.\n\nWrite a letter to your friend. In your letter:\n- say how you feel about the visit\n- suggest what you could do together\n- explain what your friend should bring\n\n${GT_TAIL}\n\nBegin your letter as follows:\nDear Sam,`,
  },
  {
    code: 'GT-T1-09',
    subtype: 'Informal Letter',
    title: 'Do\'stga minnatdorchilik',
    prompt: `A friend helped you a lot while you were moving to a new home.\n\nWrite a letter to your friend. In your letter:\n- thank your friend for the help\n- describe how the move went\n- invite your friend to visit your new home\n\n${GT_TAIL}\n\nBegin your letter as follows:\nDear Alex,`,
  },
  {
    code: 'GT-T1-10',
    subtype: 'Informal Letter',
    title: 'Rejani bekor qilish',
    prompt: `You had arranged to travel with a friend next month, but you can no longer go.\n\nWrite a letter to your friend. In your letter:\n- apologise and explain why you cannot go\n- suggest what your friend could do instead\n- propose a new date for a trip together\n\n${GT_TAIL}\n\nBegin your letter as follows:\nDear Nina,`,
  },
];

/* ---------------- Writing Task 2 — esse (20 ta) ---------------- */

const TASK2 = [
  // Opinion (agree / disagree)
  {
    code: 'T2-OP-01',
    subtype: 'Opinion Essay',
    title: 'Uydan turib ishlash',
    prompt: `Some people believe that working from home is better for both employees and companies than working in an office.\n\nTo what extent do you agree or disagree?\n\n${T2_TAIL}`,
  },
  {
    code: 'T2-OP-02',
    subtype: 'Opinion Essay',
    title: 'Universitet ta\'limi bepul bo\'lishi',
    prompt: `Some people think that university education should be free for every student.\n\nTo what extent do you agree or disagree?\n\n${T2_TAIL}`,
  },
  {
    code: 'T2-OP-03',
    subtype: 'Opinion Essay',
    title: 'Shaxsiy avtomobillarni cheklash',
    prompt: `Some people say that private cars should be banned from city centres.\n\nTo what extent do you agree or disagree?\n\n${T2_TAIL}`,
  },
  {
    code: 'T2-OP-04',
    subtype: 'Opinion Essay',
    title: 'Sun\'iy intellekt va ish o\'rinlari',
    prompt: `Some people believe that artificial intelligence will create more jobs than it destroys.\n\nTo what extent do you agree or disagree?\n\n${T2_TAIL}`,
  },
  // Discussion (both views)
  {
    code: 'T2-DS-01',
    subtype: 'Discussion Essay',
    title: 'Onlayn va an\'anaviy ta\'lim',
    prompt: `Some people believe that online learning is as effective as classroom learning, while others think that students learn better with a teacher in the room.\n\nDiscuss both views and give your own opinion.\n\n${T2_TAIL}`,
  },
  {
    code: 'T2-DS-02',
    subtype: 'Discussion Essay',
    title: 'Bolalar uchun uy vazifasi',
    prompt: `Some people think that young children should be given homework every day, while others believe that children learn more through play and rest.\n\nDiscuss both views and give your own opinion.\n\n${T2_TAIL}`,
  },
  {
    code: 'T2-DS-03',
    subtype: 'Discussion Essay',
    title: 'Davlat sarf-xarajatlari: sport yoki sog\'liq',
    prompt: `Some people argue that governments should spend money on public sports facilities, while others believe that this money would be better spent on hospitals and medical care.\n\nDiscuss both views and give your own opinion.\n\n${T2_TAIL}`,
  },
  {
    code: 'T2-DS-04',
    subtype: 'Discussion Essay',
    title: 'Qishloq va shahar hayoti',
    prompt: `Some people prefer to live in large cities, while others believe that life in the countryside is healthier and more enjoyable.\n\nDiscuss both views and give your own opinion.\n\n${T2_TAIL}`,
  },
  // Advantages / Disadvantages
  {
    code: 'T2-AD-01',
    subtype: 'Advantages / Disadvantages',
    title: 'Chet elda o\'qish',
    prompt: `More and more students choose to study at a university in another country.\n\nDo the advantages of this trend outweigh the disadvantages?\n\n${T2_TAIL}`,
  },
  {
    code: 'T2-AD-02',
    subtype: 'Advantages / Disadvantages',
    title: 'Ijtimoiy tarmoqlar',
    prompt: `Social media has become the main source of news for many people.\n\nDo the advantages of this development outweigh the disadvantages?\n\n${T2_TAIL}`,
  },
  {
    code: 'T2-AD-03',
    subtype: 'Advantages / Disadvantages',
    title: 'Turizmning o\'sishi',
    prompt: `Tourism has grown rapidly in many developing countries.\n\nDiscuss the advantages and disadvantages of this trend.\n\n${T2_TAIL}`,
  },
  {
    code: 'T2-AD-04',
    subtype: 'Advantages / Disadvantages',
    title: 'To\'rt kunlik ish haftasi',
    prompt: `Some companies have introduced a four-day working week without reducing salaries.\n\nDo the advantages of this change outweigh the disadvantages?\n\n${T2_TAIL}`,
  },
  // Problem / Solution
  {
    code: 'T2-PS-01',
    subtype: 'Problem / Solution',
    title: 'Shaharlarda tirbandlik',
    prompt: `Traffic congestion is becoming a serious problem in many large cities.\n\nWhat are the causes of this problem and what measures could be taken to solve it?\n\n${T2_TAIL}`,
  },
  {
    code: 'T2-PS-02',
    subtype: 'Problem / Solution',
    title: 'Oziq-ovqat isrofi',
    prompt: `A large amount of food is thrown away by shops and households every year.\n\nWhy does this happen and what can be done to reduce food waste?\n\n${T2_TAIL}`,
  },
  {
    code: 'T2-PS-03',
    subtype: 'Problem / Solution',
    title: 'Yoshlar orasida harakatsizlik',
    prompt: `In many countries young people are becoming less physically active.\n\nWhat are the reasons for this and what solutions could be introduced?\n\n${T2_TAIL}`,
  },
  {
    code: 'T2-PS-04',
    subtype: 'Problem / Solution',
    title: 'Qishloqdan shaharga ko\'chish',
    prompt: `Large numbers of people are moving from rural areas to cities in search of work.\n\nWhat problems does this cause and how could they be addressed?\n\n${T2_TAIL}`,
  },
  // Two-part question
  {
    code: 'T2-TP-01',
    subtype: 'Two-part Question',
    title: 'Ish tanlash mezoni',
    prompt: `Many people now change their career several times during their working life.\n\nWhy is this happening? Is this a positive or a negative development?\n\n${T2_TAIL}`,
  },
  {
    code: 'T2-TP-02',
    subtype: 'Two-part Question',
    title: 'An\'analarning yo\'qolishi',
    prompt: `In many countries traditional customs and festivals are disappearing.\n\nWhy is this happening? What could be done to preserve them?\n\n${T2_TAIL}`,
  },
  {
    code: 'T2-TP-03',
    subtype: 'Two-part Question',
    title: 'Kitob o\'qish odati',
    prompt: `Fewer people read books for pleasure than in the past.\n\nWhat are the reasons for this? How can reading be encouraged among young people?\n\n${T2_TAIL}`,
  },
  {
    code: 'T2-TP-04',
    subtype: 'Two-part Question',
    title: 'Masofaviy tibbiyot',
    prompt: `Some medical appointments now take place online rather than face to face.\n\nWhy is this becoming common? Do you think this is a positive or a negative development?\n\n${T2_TAIL}`,
  },
];

/* ---------------- Vocabulary (6 ta to'plam, 60 so'z) ---------------- */

const VOCAB = [
  {
    code: 'VOC-E-01',
    level: 'EASY',
    title: "Boshlang'ich: o'zgarish so'zlari",
    body: 'increase decrease growth decline percentage average majority minority trend stable',
  },
  {
    code: 'VOC-E-02',
    level: 'EASY',
    title: "Boshlang'ich: diagramma tili",
    body: 'rise fall peak gradual rapid steady significant slight overall compare',
  },
  {
    code: 'VOC-M-01',
    level: 'MEDIUM',
    title: "O'rta: aniqlik va bog'lovchilar",
    body: 'fluctuate substantial considerable proportion approximately respectively whereas moreover furthermore nevertheless',
  },
  {
    code: 'VOC-M-02',
    level: 'MEDIUM',
    title: "O'rta: akademik fe'llar",
    body: 'consumption distribution illustrate indicate demonstrate remarkable subsequent initial category figure',
  },
  {
    code: 'VOC-H-01',
    level: 'HARD',
    title: 'Yuqori: murakkab atamalar',
    body: 'unprecedented disproportionate comprehensive phenomenon inevitable prevalent deteriorate accumulate discrepancy correlation',
  },
  {
    code: 'VOC-H-02',
    level: 'HARD',
    title: 'Yuqori: esse leksikasi',
    body: 'mitigate exacerbate sustainable controversial implementation infrastructure socioeconomic detrimental advocate alleviate',
  },
];

/* ---------------- Typing paragraphs (20 ta) ---------------- */

const PARAGRAPHS = [
  ['TYP-01', 'Ta\'lim va texnologiya', 'Technology has changed the way students learn. Online courses allow people to study at their own pace, and many universities now offer lectures that can be watched at any time. However, some teachers argue that face-to-face discussion remains essential for deep understanding.'],
  ['TYP-02', 'Shahar transporti', 'Public transport plays a vital role in reducing traffic congestion. When buses and trains are frequent, reliable and affordable, fewer people choose to drive. Cities that invest in cycling lanes and pedestrian areas also report cleaner air and quieter streets.'],
  ['TYP-03', 'Iqlim o\'zgarishi', 'Climate change is one of the most serious challenges facing the modern world. Rising temperatures affect agriculture, water supplies and human health. Many governments have promised to reduce emissions, but progress has been slower than scientists recommend.'],
  ['TYP-04', 'Sog\'lom turmush', 'Regular physical activity improves both physical and mental health. Walking for thirty minutes a day can lower the risk of heart disease, while team sports help people build social connections. Small changes in daily routine often produce lasting benefits.'],
  ['TYP-05', 'Uzoqdan ishlash', 'Remote work became widespread during the pandemic and has remained popular ever since. Employees save time on commuting and enjoy greater flexibility. Employers, meanwhile, can reduce office costs and recruit talented staff from other regions.'],
  ['TYP-06', 'Kitob o\'qish', 'Reading for pleasure develops vocabulary, concentration and imagination. Although digital devices compete for attention, libraries continue to attract readers of all ages. Parents who read aloud to young children give them a valuable academic advantage.'],
  ['TYP-07', 'Chiqindilarni qayta ishlash', 'Recycling reduces the amount of waste sent to landfill and saves natural resources. Paper, glass and aluminium can be processed and used again many times. Effective recycling depends on clear labelling and convenient collection points.'],
  ['TYP-08', 'Sun\'iy intellekt', 'Artificial intelligence is now used in medicine, transport and education. These systems can analyse large amounts of data far more quickly than humans. Nevertheless, questions about privacy, fairness and accountability remain unresolved.'],
  ['TYP-09', 'Turizm', 'Tourism brings income and employment to many regions. At the same time, large numbers of visitors can damage fragile environments and raise the cost of housing for local residents. Sustainable tourism attempts to balance these competing interests.'],
  ['TYP-10', 'Til o\'rganish', 'Learning a foreign language opens doors to new cultures and career opportunities. Regular practice matters more than natural talent, and speaking with native speakers accelerates progress. Most learners benefit from studying a little every day.'],
  ['TYP-11', 'Suv resurslari', 'Fresh water is a limited resource, yet it is often used carelessly. Agriculture accounts for the largest share of consumption worldwide. Simple measures such as repairing leaks and improving irrigation can save enormous quantities of water.'],
  ['TYP-12', 'Ishga qabul qilish', 'Employers increasingly value practical skills alongside formal qualifications. Candidates who can demonstrate teamwork, communication and problem solving often stand out. Work experience and personal projects can be as persuasive as a university degree.'],
  ['TYP-13', 'Uy qurilishi', 'Housing shortages affect many growing cities. Building new homes near public transport reduces travel time and pollution. Some architects now design buildings that use less energy for heating, cooling and lighting.'],
  ['TYP-14', 'Ijtimoiy tarmoqlar', 'Social media allows people to stay in touch across long distances and to share information instantly. Critics argue, however, that it encourages comparison and reduces the time available for face-to-face conversation.'],
  ['TYP-15', 'Ovqatlanish', 'A balanced diet includes vegetables, fruit, whole grains and sufficient protein. Nutritionists recommend limiting processed food and sugary drinks. Cooking at home usually costs less and gives people greater control over what they eat.'],
  ['TYP-16', 'Kosmik tadqiqotlar', 'Space exploration has produced technologies that are now part of everyday life, including satellite navigation and weather forecasting. Critics question the expense, while supporters point to scientific discovery and international cooperation.'],
  ['TYP-17', 'Kichik biznes', 'Small businesses create a significant proportion of new jobs. They often respond to local needs more quickly than large corporations. Access to affordable credit and simple regulation are crucial for their survival in the first few years.'],
  ['TYP-18', 'Muzeylar', 'Museums preserve objects that help us understand the past. Many now offer interactive exhibitions and free entry for students. Digital collections allow people to explore artefacts without travelling to another country.'],
  ['TYP-19', 'Uyqu', 'Sleep is essential for memory, mood and physical recovery. Adults generally need between seven and nine hours each night. Screens before bedtime and irregular schedules are among the most common causes of poor sleep quality.'],
  ['TYP-20', 'Ko\'ngilli faoliyat', 'Volunteering benefits both the community and the volunteer. People who give their time regularly report higher levels of satisfaction and develop useful skills. Many organisations depend entirely on unpaid helpers to deliver their services.'],
];

/* ---------------- Yagona ro'yxat ---------------- */

const TASKS = [
  ...ACADEMIC_T1.map((t, i) => ({
    ...t,
    type: 'ACADEMIC_T1',
    minWords: 150,
    durationSec: 1200,
    order: i,
    visual: t.visual || 'NONE',
  })),
  ...GENERAL_T1.map((t, i) => ({
    ...t, type: 'GENERAL_T1', minWords: 150, durationSec: 1200, order: i,
  })),
  ...TASK2.map((t, i) => ({
    ...t, type: 'TASK2', minWords: 250, durationSec: 2400, order: i,
  })),
  ...VOCAB.map((t, i) => ({
    ...t,
    type: 'VOCAB',
    subtype: 'Vocabulary',
    prompt: 'Type the IELTS academic words below as accurately as you can.',
    order: i,
  })),
  ...PARAGRAPHS.map(([code, title, body], i) => ({
    code,
    type: 'TYPING',
    subtype: 'Paragraph',
    title,
    body,
    prompt: 'Copy the paragraph below as accurately as you can.',
    order: i,
  })),
];

module.exports = { TASKS };
