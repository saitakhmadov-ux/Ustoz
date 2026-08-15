// "Klaviaturada tez yozish" kursining mazmuni (seed uchun ma'lumot).
//
// Har bir dars — bitta yozish mashqi. Video/test yo'q, shuning uchun darsda
// aynan bitta vazifa bo'ladi va progress sodda hisoblanadi.
//
// Maqsadlar (targetWpm / targetAccuracy) bo'lim sayin oshib boradi:
// boshida 10 so'z/daqiqa va 90% aniqlik, oxirida 35 va 96%.
//
// Mashq matnlari o'zbek lotin alifbosida. "oʻ", "gʻ" va tutuq belgisi to'g'ri
// belgilar bilan yozilgan, ammo pleer oddiy ' ni ham to'g'ri deb qabul qiladi.

const COURSE = {
  slug: 'klaviaturada-tez-yozish',
  title: 'Klaviaturada tez yozish',
  authorName: 'Ustoz jamoasi',
  description: 'Klaviaturada qaramasdan, tez va xatosiz yozishni o\'rganing. '
    + 'Mashqlar o\'zbek tilida (lotin yozuvi): asosiy qatordan boshlab, oʻ va gʻ '
    + 'harflarigacha, so\'z va matnlargacha. Har bir darsda tezligingiz (so\'z/daqiqa) '
    + 'va aniqligingiz o\'lchanadi. Kurs butunlay bepul.',
  thumbnail: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800',
  categorySlug: 'office', // topilmasa birinchi kategoriya olinadi
  level: 'BEGINNER',
  accessMonths: 60, // mashq kursi — amalda muddatsiz
};

// mode: KEYS (harflar), WORDS (so'zlar), TEXT (jumlalar), TIMED (vaqtga qarshi)
const SECTIONS = [
  {
    title: '1-bo\'lim. Tayyorgarlik va asosiy qator',
    targetWpm: 10,
    targetAccuracy: 90,
    lessons: [
      {
        title: 'F tugmasi',
        mode: 'KEYS',
        // Eng birinchi mashq — maqsad past, odam klaviatura bilan tanishsin
        targetWpm: 6,
        targetAccuracy: 88,
        hint: 'Chap qo\'l ko\'rsatkich barmog\'ingizni F tugmasiga qo\'ying — unda kichik '
          + 'do\'mboqcha bor, uni ko\'rmasdan ham topasiz. Faqat shu barmoq bilan bosing '
          + 'va har bosishdan keyin barmoqni joyida qoldiring.',
        content: 'f f f ff ff fff f f ff fff ff f f fff ff f ff f fff f',
      },
      {
        title: 'J tugmasi',
        mode: 'KEYS',
        targetWpm: 6,
        targetAccuracy: 88,
        hint: 'Endi o\'ng qo\'l ko\'rsatkich barmog\'i — J tugmasi. Unda ham do\'mboqcha bor. '
          + 'Klaviaturaga qaramang, barmoq o\'zi topsin.',
        content: 'j j j jj jj jjj j j jj jjj jj j j jjj jj j jj j jjj j',
      },
      {
        title: 'Tayanch holat: F va J',
        mode: 'KEYS',
        targetWpm: 8,
        hint: 'Ikkala ko\'rsatkich barmoq birga ishlaydi. Qolgan barmoqlar D, S, A va '
          + 'K, L, ; ustida tayyor turadi.',
        content: 'fff jjj fff jjj fjf jfj ff jj fj jf fjfj jfjf fj fj jf jf',
      },
      {
        title: 'D va K',
        mode: 'KEYS',
        hint: 'O\'rta barmoqlar bilan yozing. Har bosishdan keyin barmoq tayanch holatga qaytsin.',
        content: 'ddd kkk dkd kdk dk kd dd kk fdk jkd dkfj kdjf dk fj kd jf',
      },
      {
        title: 'F, J, D, K — birga',
        mode: 'KEYS',
        hint: 'To\'rt tugma aralash. Qaysi barmoq qaysi tugmani bosishini eslab qoling.',
        content: 'fdjk kjdf fjdk djfk kdfj jfkd dfjk kfdj fdkj jkdf dkfj',
      },
      {
        title: 'S va L',
        mode: 'KEYS',
        hint: 'Nomsiz barmoqlar — eng kuchsizi. Shoshilmang, aniqlik tezlikdan muhimroq.',
        content: 'sss lll sls lsl sl ls ss ll sdf lkj sldk lsdk fsjl sdfj',
      },
      {
        title: 'A va ; — asosiy qator to\'liq',
        mode: 'KEYS',
        hint: 'Jimjiloq barmoqlar chetdagi A va ; tugmalarini bosadi.',
        content: 'aaa ;;; a;a ;a; asdf jkl; asdf jkl; fjdk slam a;sldkfj',
      },
      {
        title: 'Asosiy qator: aralash mashq',
        mode: 'KEYS',
        hint: 'Sakkiz tugma tasodifiy tartibda — barmoqlar tayanch holatdan uzoqlashmasin.',
        content: 'asdf jkl; sadj lkfa dksl fjas ;lka sdjf klas fjd; askl',
      },
      {
        title: 'Asosiy qator so\'zlari',
        mode: 'WORDS',
        hint: 'Endi haqiqiy so\'zlar. Faqat asosiy qatordagi harflar ishlatilgan.',
        content: 'dala sal fald jalak salad askal falak dallas lak sadaf jasad',
      },
    ],
  },
  {
    title: '2-bo\'lim. Yuqori qator',
    targetWpm: 15,
    targetAccuracy: 92,
    lessons: [
      {
        title: 'E va I',
        mode: 'KEYS',
        hint: 'O\'rta barmoqlarni yuqoriga cho\'zing, so\'ng tayanch holatga qaytaring.',
        content: 'eee iii eie iei de ki ed ik dek kie edik kide deki iked',
      },
      {
        title: 'R va U',
        mode: 'KEYS',
        hint: 'Ko\'rsatkich barmoqlar R va U ga cho\'ziladi.',
        content: 'rrr uuu rur uru fr ju rf uj rud urf ruju urfj rfuj',
      },
      {
        title: 'E, I, R, U — birga',
        mode: 'KEYS',
        hint: 'To\'rt tugma aralash. Har bosishdan keyin barmoq asosiy qatorga qaytadi.',
        content: 'erui iure ruei eiru uier reiu eiur ruie iera ueri',
      },
      {
        title: 'T va Y',
        mode: 'KEYS',
        hint: 'T va Y — ko\'rsatkich barmoqlarning ikkinchi tugmasi.',
        content: 'ttt yyy tyt yty ft jy tf yj tuy yut tyuj ytfj tuti',
      },
      {
        title: 'Q va W',
        mode: 'KEYS',
        hint: 'Chap qo\'l cheti: Q — jimjiloq, W — nomsiz barmoq.',
        content: 'qqq www qwq wqw qw wq aq sw qwas swqa qwsa wqas qw wq',
      },
      {
        title: 'O va P',
        mode: 'KEYS',
        hint: 'O\'ng qo\'l cheti: O — nomsiz, P — jimjiloq barmoq.',
        content: 'ooo ppp opo pop op po lo ;p opl; p;lo poli olpi op po',
      },
      {
        title: 'Q, W, O va P',
        mode: 'KEYS',
        hint: 'Endi to\'rtalasi birga — klaviaturaning eng chekka tugmalari.',
        content: 'qqq www ooo ppp qw op qwop pwoq qwer poiu qopw wpoq',
      },
      {
        title: 'Yuqori qator to\'liq',
        mode: 'KEYS',
        hint: 'O\'n ta tugma aralash. Sekin boshlang — tezlik keyin keladi.',
        content: 'qwer tyui op qtwy repu iyow tqru pwoi ureq wyti opqe',
      },
      {
        title: 'Yuqori qator so\'zlari',
        mode: 'WORDS',
        content: 'toy quti oyoq turi yer teri yurt qish tuproq quyosh pista',
      },
    ],
  },
  {
    title: '3-bo\'lim. Pastki qator',
    targetWpm: 18,
    targetAccuracy: 93,
    lessons: [
      {
        title: 'V va M',
        mode: 'KEYS',
        hint: 'Ko\'rsatkich barmoqlarni pastga tushiring.',
        content: 'vvv mmm vmv mvm fv jm vf mj vam mav vmfj mvjf avm',
      },
      {
        title: 'C va N',
        mode: 'KEYS',
        content: 'ccc nnn cnc ncn dc jn cd nj can nac cndk ncjd canc',
      },
      {
        title: 'V, M, C, N — birga',
        mode: 'KEYS',
        hint: 'Pastki qatorning to\'rt tugmasi aralash.',
        content: 'vmcn nmvc cnvm mvnc vncm nvmc cmnv vcmn mncv cvnm',
      },
      {
        title: 'X va Z',
        mode: 'KEYS',
        hint: 'Z va X — chap qo\'lning eng kuchsiz barmoqlari: jimjiloq va nomsiz. '
          + 'Shoshilmang.',
        content: 'xxx zzz xzx zxz az sx zax xza szx xsz zxas sxza zx xz',
      },
      {
        title: 'B tugmasi',
        mode: 'KEYS',
        hint: 'B — chap ko\'rsatkich barmoq uchun eng uzoq tugma.',
        content: 'bbb bfb fbf bb fb bf bab bib bub fbfb bfbf bnb bmb',
      },
      {
        title: 'X, Z va B',
        mode: 'KEYS',
        hint: 'Uchalasi birga — pastki qatorning eng qiyin qismi.',
        content: 'xxx zzz bbb xzb bzx az xz bz zab bax xzab bzax zbxa',
      },
      {
        title: 'Pastki qator to\'liq',
        mode: 'KEYS',
        content: 'zxcv bnm, zxcvbnm mnbvcxz vbnm zxcv cvbn xzmn bvcx',
      },
      {
        title: 'Pastki qator so\'zlari',
        mode: 'WORDS',
        content: 'non muz zamin mavze bezak nozik xazina baxt maxsus vazn zabt',
      },
    ],
  },
  {
    title: '4-bo\'lim. Butun klaviatura',
    targetWpm: 22,
    targetAccuracy: 94,
    lessons: [
      {
        title: 'Uch qator aralash',
        mode: 'KEYS',
        hint: 'Yuqori, asosiy va pastki qator birga. Ko\'zingiz ekranda, barmoqlar tugmada.',
        content: 'faz jum ked lov sib gnu tyc pxq wrb men qaz plm okn ijb',
      },
      {
        title: 'Aralash so\'zlar',
        mode: 'WORDS',
        hint: 'Barcha qatorlar aralash. Barmoqlar tayanch holatdan uzoqlashmasin.',
        content: 'kitob daftar qalam maktab talaba ustoz bilim mehnat natija reja',
      },
      {
        title: 'Katta harflar (Shift)',
        mode: 'WORDS',
        hint: 'Katta harf uchun QARAMA-QARSHI qo\'lning Shift tugmasini bosing: '
          + 'chap harf uchun o\'ng Shift, o\'ng harf uchun chap Shift.',
        content: 'Toshkent Samarqand Buxoro Xiva Navoiy Andijon Fargʻona Namangan Nukus',
      },
      {
        title: 'Shift bilan jumlalar',
        mode: 'TEXT',
        hint: 'Har jumla katta harf bilan boshlanadi. Shift tugmasini bosib turib harfni bosing.',
        content: 'Bugun havo issiq. Ertaga yomgʻir yogʻadi. Biz maktabga bordik. '
          + 'Ustoz yangi mavzuni tushuntirdi.',
      },
      {
        title: 'Tinish belgilari',
        mode: 'TEXT',
        hint: 'Vergul va nuqta — o\'ng qo\'l. Undov va so\'roq belgisi Shift bilan bosiladi.',
        content: 'salom, dunyo. qanday ahvol? juda yaxshi! ha, albatta; yo\'q, rahmat.',
      },
      {
        title: 'Raqamlar',
        mode: 'KEYS',
        hint: 'Raqamlar qatoriga qo\'lni ko\'tarmang — barmoqlarni cho\'zing.',
        content: '123 456 789 0 2026 12 30 100 45 78 1990 2024 365 24 60',
      },
    ],
  },
  {
    title: '5-bo\'lim. O\'zbek harflari',
    targetWpm: 25,
    targetAccuracy: 95,
    lessons: [
      {
        title: 'oʻ harfi',
        mode: 'WORDS',
        hint: 'oʻ — o harfi va apostrof. Klaviaturada oddiy \' tugmasini bossangiz ham to\'g\'ri hisoblanadi.',
        content: 'oʻzbek koʻz soʻz toʻy oʻn oʻrik oʻqish toʻgʻri oʻrtoq koʻcha oʻsimlik',
      },
      {
        title: 'gʻ harfi',
        mode: 'WORDS',
        content: 'gʻalaba togʻ bogʻ ogʻiz yogʻ sogʻlom gʻoya ogʻir tugʻilgan sogʻinch',
      },
      {
        title: 'oʻ va gʻ aralash',
        mode: 'WORDS',
        hint: 'Ikkala harf bir matnda. Apostrof o\'ng qo\'l jimjiloq barmog\'i bilan bosiladi.',
        content: 'toʻgʻri oʻgʻil sogʻliq yoʻgʻon oʻrmon gʻoyat oʻzgargan bogʻbon '
          + 'toʻlqin gʻalati oʻrgimchak',
      },
      {
        title: 'ch harfi',
        mode: 'WORDS',
        hint: 'ch — ikki alohida harf: c va h. Ikkalasini ketma-ket bosing.',
        content: 'chiroq choy uchun kecha ochiq chaqmoq kuch och ichki chek achchiq',
      },
      {
        title: 'ch va sh aralash',
        mode: 'WORDS',
        hint: 'Ikki harfli birikmalar: c+h va s+h. Ikkalasini ketma-ket, to\'xtamasdan bosing.',
        content: 'chiroyli shifokor uchrashuv shoshilinch choyxona shivirlash '
          + 'kechqurun shaxsiy achchiq shirinlik',
      },
      {
        title: 'sh va ng',
        mode: 'WORDS',
        content: 'shahar ishla yaxshi shirin shamol keng teng ming rang qanoat oshxona',
      },
      {
        title: 'Tutuq belgisi (ʼ)',
        mode: 'WORDS',
        hint: 'Tutuq belgisi ham apostrof bilan yoziladi: maʼno, taʼlim.',
        content: 'maʼno taʼlim sanʼat surʼat maʼlum shaʼn jurʼat inʼom maʼruza',
      },
    ],
  },
  {
    title: '6-bo\'lim. So\'zlar va iboralar',
    targetWpm: 30,
    targetAccuracy: 95,
    lessons: [
      {
        title: 'Ko\'p uchraydigan so\'zlar',
        mode: 'WORDS',
        content: 'men sen biz siz ular bugun ertaga vaqt yaxshi katta kichik yangi '
          + 'kun oy yil uy ish bola oila doʻst inson',
      },
      {
        title: 'Qisqa so\'zlar — tezlik',
        mode: 'WORDS',
        hint: 'Qisqa so\'zlar tezlikni oshiradi. To\'xtamasdan, bir maromda yozing.',
        content: 'bir ikki uch olti yer suv non kun tun oy yil uy ish bor yoʻq ha '
          + 'shu bu har ham yana tez kam koʻp',
      },
      {
        title: 'IT atamalari',
        mode: 'WORDS',
        content: 'kompyuter klaviatura dastur internet sayt fayl papka tugma ekran '
          + 'xotira tarmoq parol foydalanuvchi',
      },
      {
        title: 'Uzun so\'zlar',
        mode: 'WORDS',
        hint: 'Uzun so\'zlarda barmoqlar butun klaviatura bo\'ylab harakatlanadi.',
        content: 'mustaqillik oʻqituvchilar tashkilotchilik rivojlantirish '
          + 'mutaxassislik zamonaviylashtirish hamkorlikdagi tayyorgarlik '
          + 'muvaffaqiyatli',
      },
      {
        title: 'Kundalik iboralar',
        mode: 'TEXT',
        content: 'xayrli tong. qalaysiz? rahmat, yaxshi. koʻrishguncha. yaxshi qoling. '
          + 'iltimos, yordam bering. kechirasiz, kech qoldim.',
      },
      {
        title: 'Aralash mashq',
        mode: 'WORDS',
        content: 'oʻqituvchi togʻa chiroyli yaxshiroq ishonch koʻngil gʻayrat '
          + 'shoshilinch maʼlumot toʻgʻrisida uchrashuv',
      },
    ],
  },
  {
    title: '7-bo\'lim. Matnlar va tezlik testlari',
    targetWpm: 35,
    targetAccuracy: 96,
    lessons: [
      {
        title: 'Qisqa matn',
        mode: 'TEXT',
        hint: 'Endi yaxlit matn. Xato qilsangiz to\'xtamang — davom eting, aniqlik oxirida hisoblanadi.',
        content: 'Har kuni yigirma daqiqa mashq qilgan odam bir oyda yozish tezligini '
          + 'ikki barobar oshiradi. Eng muhimi — klaviaturaga qaramaslik.',
      },
      {
        title: 'O\'rta matn',
        mode: 'TEXT',
        content: 'Kompyuterda tez yozish — bugungi kunda har bir kasb egasiga kerak '
          + 'boʻlgan koʻnikma. Xat yozasizmi, hisobot tayyorlaysizmi yoki dastur '
          + 'yozasizmi — barmoqlaringiz qanchalik tez ishlasa, fikringiz shunchalik '
          + 'erkin boʻladi. Mashq qilishda shoshilmang: avval aniqlik, keyin tezlik.',
      },
      {
        title: 'Uzun matn',
        mode: 'TEXT',
        hint: 'Uzun matnda diqqatni saqlash muhim. Xato qilsangiz to\'xtamang.',
        content: 'Klaviaturada yozish koʻnikmasi velosiped haydashga oʻxshaydi: '
          + 'boshida har bir harakatni oʻylab qilasiz, keyin qoʻlingiz oʻzi biladi. '
          + 'Shuning uchun mashqni har kuni takrorlash kerak. Kuniga yigirma daqiqa '
          + 'muntazam mashq bir oyda sezilarli natija beradi. Eng katta xato — '
          + 'klaviaturaga qarab yozish: bunda barmoqlar tugmalar oʻrnini hech qachon '
          + 'yodlab olmaydi.',
      },
      {
        title: 'Yarim daqiqalik tezlik testi',
        mode: 'TIMED',
        durationSec: 30,
        hint: 'Qisqa test — o\'ttiz soniya. Imkon qadar ko\'p va aniq yozing.',
        content: 'yozuv tezlik aniqlik mashq barmoq klaviatura soʻz matn sahifa '
          + 'daftar kitob bilim mehnat natija koʻnikma',
      },
      {
        title: 'Bir daqiqalik tezlik testi',
        mode: 'TIMED',
        durationSec: 60,
        hint: 'Bir daqiqa davomida imkon qadar koʻp soʻz yozing. Matn tugamaydi — takrorlanadi.',
        content: 'oʻzbek tili bilim mehnat natija koʻnikma tezlik aniqlik mashq '
          + 'klaviatura barmoq yozuv matn soʻz jumla sahifa kitob daftar',
      },
      {
        title: 'Yakuniy test',
        mode: 'TIMED',
        durationSec: 60,
        hint: 'Kursning yakuniy sinovi. Muvaffaqiyatli topshirsangiz sertifikat beriladi.',
        content: 'Tez yozish koʻnikmasi mashq bilan shakllanadi. Har kuni oz-ozdan '
          + 'mashq qiling va natijani kuzatib boring. Aniqlik tezlikdan muhimroq, '
          + 'chunki xatoni tuzatish yozishdan koʻra koʻproq vaqt oladi.',
      },
    ],
  },
];

module.exports = { COURSE, SECTIONS };
