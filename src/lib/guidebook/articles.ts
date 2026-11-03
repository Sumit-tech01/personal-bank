import type { GuidebookArticle } from "./types";

export const GUIDEBOOK_ARTICLES: GuidebookArticle[] = [
  {
    id: "getting-started",
    category: "basics",
    categoryLabel: { en: "Getting Started", mr: "सुरुवात कशी करावी" },
    icon: "Compass",
    relatedIds: ["expense-management", "farm-management", "backup-restore"],
    en: {
      title: "Getting Started with Personal Bank",
      shortExplanation: "An introduction to Personal Bank, your family, farm, and financial companion.",
      whyUseful: "Helps you set up your account, understand the dashboard layout, navigate smoothly, and track available cash and farm balances from day one.",
      prerequisites: ["Open the Personal Bank app in your browser or installed PWA on Android."],
      steps: [
        "Open Personal Bank and set up your profile name, optional mobile number, and town/village.",
        "Set a memorable 4 to 6-digit security PIN and write down the generated recovery code.",
        "Explore the bottom navigation bar: Home (Dashboard), Expenses, Farm, Reports, and More.",
        "Tap the central green '+' button at any time to quickly record an expense, income, crop activity, or payment.",
        "Review your Available Balance card on the Home screen to see real-time net liquidity across cash and bank accounts.",
      ],
      example: {
        scenario: "First-time setup for a farming household",
        details: "Ramesh sets up his profile as 'Ramesh Patil' from 'Baramati', enters a 4-digit PIN, and saves his recovery key in a personal diary.",
        result: "Ramesh can immediately record his daily transactions and inspect live balance totals on the dashboard.",
      },
      expectedResult: "Your profile is active, protected by your secret PIN, and ready for instant offline-first bookkeeping.",
      commonMistakes: [
        "Forgetting to write down the recovery code during first setup.",
        "Closing the browser without setting a PIN when sharing devices with other people.",
      ],
      faqs: [
        {
          q: "Does Personal Bank work without internet connection?",
          a: "Yes. All records are stored locally in your device's IndexedDB database and remain 100% accessible offline. When connected, changes automatically sync to your secure MongoDB cloud cluster.",
        },
        {
          q: "Where is my money stored?",
          a: "Personal Bank does not hold or move real money. It is your private digital ledger (हिशोब वही) that computes and tracks your family cash, bank accounts, and farm profit.",
        },
      ],
      troubleshooting: [
        {
          problem: "The app prompts for PIN on every reload.",
          a: "This is intentional security behavior when session protection is active. Enter your PIN to unlock your ledger.",
        },
      ],
      keywords: ["setup", "getting started", "pin", "login", "home", "dashboard", "balance", "navigation"],
    },
    mr: {
      title: "पर्सनल बँक: सुरुवात कशी करावी",
      shortExplanation: "पर्सनल बँक ॲपची ओळख — तुमचे कुटुंब, तुमची शेती आणि तुमचा संपूर्ण हिशोब.",
      whyUseful: "तुमचे खाते सुरू करणे, मुख्य स्क्रीन समजून घेणे आणि रोख व बँक शिल्लक अचूकपणे पाहण्यासाठी हे मार्गदर्शक उपयुक्त आहे.",
      prerequisites: ["मोबाईल किंवा कॉम्प्युटरवर पर्सनल बँक ॲप उघडा."],
      steps: [
        "ॲप उघडून तुमचे नाव, मोबाईल नंबर (पर्यायी) आणि गाव किंवा शहराचे नाव भरा.",
        "तुमच्या लक्षात राहील असा ४ ते ६ अंकी गुप्त पिन (PIN) तयार करा आणि दिलेला रिकव्हरी कोड सुरक्षित ठिकाणी लिहून ठेवा.",
        "खालील नेव्हिगेशन बार पहा: मुख्य पान, खर्च, शेती, अहवाल आणि अधिक पर्याय.",
        "कोणताही खर्च, उत्पन्न किंवा मजुरी नोंदवण्यासाठी मधोमध असलेल्या हिरव्या '+' बटनावर टॅप करा.",
        "मुख्य पानावर तुमची शिल्लक रक्कम, एकूण उत्पन्न आणि खर्च एका दृष्टिक्षेपात पहा.",
      ],
      example: {
        scenario: "शेतकरी कुटुंबासाठी पहिली नोंदणी",
        details: "रमेश पाटलांनी 'रमेश पाटील, बारामती' अशी नोंद केली, ४ अंकी पिन सेट केला आणि डायरीत रिकव्हरी कोड लिहून ठेवला.",
        result: "रमेश आता दररोजचा शेती व घरखर्च त्वरित नोंदवू शकतात.",
      },
      expectedResult: "तुमचे खाते सुरक्षितपणे सुरू होईल आणि इंटरनेट नसतानाही सहज चालेल.",
      commonMistakes: [
        "रिकव्हरी कोड लिहून न ठेवणे.",
        "इतर व्यक्तींसोबत फोन वापरताना पिन लॉक न ठेवणे.",
      ],
      faqs: [
        {
          q: "इंटरनेट नसताना हे ॲप चालते का?",
          a: "होय! पर्सनल बँक पूर्णपणे ऑफलाइन चालते. तुमच्या सर्व नोंदी फोनमध्ये सुरक्षित राहतात आणि इंटरनेट आल्यावर आपोआप क्लाउडवर सिंक होतात.",
        },
        {
          q: "यात बँक खात्यातून थेट पैसे कापले जातात का?",
          a: "नाही. हे केवळ तुमचा घरगुती व शेतीचा हिशोब ठेवण्याचे सुरक्षित डिजिटल खातेवही (खतावणी) ॲप आहे.",
        },
      ],
      troubleshooting: [
        {
          problem: "ॲप उघडल्यावर प्रत्येक वेळी पिन विचारतो.",
          a: "तुमच्या आर्थिक नोंदी सुरक्षित ठेवण्यासाठी ही सुरक्षा व्यवस्था आहे. तुमचा सेट केलेला पिन टाकून ॲप अनलॉक करा.",
        },
      ],
      keywords: ["सुरुवात", "पिन", "मुख्य पान", "हिशोब", "शिल्लक", "नेव्हिगेशन"],
    },
  },

  {
    id: "family-management",
    category: "basics",
    categoryLabel: { en: "Family Management", mr: "कुटुंब व्यवस्थापन" },
    icon: "Users",
    relatedIds: ["getting-started", "expense-management", "reminders"],
    en: {
      title: "Family Member Management",
      shortExplanation: "Organize family members, relations, birthdays, and household records.",
      whyUseful: "Enables assigning expenses to specific family members, remembering birthdays, and maintaining complete family records.",
      prerequisites: ["Account set up and unlocked."],
      steps: [
        "Go to More > Family Members.",
        "Tap 'Add Family Member'.",
        "Enter member name, relationship (Self, Spouse, Son, Daughter, Father, Mother, etc.), phone number, and birth date.",
        "Save the record to link future medical, education, and personal expenses directly to this person.",
      ],
      example: {
        scenario: "Adding children for school fee tracking",
        details: "Add son 'Aniket' and link school fee payments under his name.",
        result: "Filter reports to see total educational investment per child.",
      },
      expectedResult: "Family members appear in member list and in expense attribution dropdowns.",
      commonMistakes: [
        "Entering duplicate entries for the same member.",
      ],
      faqs: [
        {
          q: "Can I remove a family member without losing their past expenses?",
          a: "Yes. Deleting a family member profile keeps historical transaction amounts intact in the ledger.",
        },
      ],
      troubleshooting: [
        {
          problem: "Family member does not appear in transaction filter.",
          a: "Verify that the family member was saved and has not been marked as deleted.",
        },
      ],
      keywords: ["family", "members", "relationship", "birthday", "children", "household"],
    },
    mr: {
      title: "कुटुंब सदस्य व्यवस्थापन",
      shortExplanation: "घरातील सदस्य, नाती, संपर्क आणि वाढदिवसाची नोंद ठेवा.",
      whyUseful: "शिक्षणाचा किंवा औषधांचा खर्च कोणावर किती झाला हे समजण्यासाठी आणि वाढदिवसाचे स्मरण राहण्यासाठी हे उपयुक्त आहे.",
      prerequisites: ["ॲप अनलॉक केलेले असणे."],
      steps: [
        "'अधिक' मेनूमध्ये जाऊन 'कुटुंब सदस्य' (Family) वर टॅप करा.",
        "'कुटुंब सदस्य जोडा' बटनावर क्लिक करा.",
        "सदस्याचे नाव, नाते (पत्नी, मुलगा, मुलगी, आई, वडील इत्यादी), फोन नंबर आणि जन्म तारीख भरा.",
        "'जतन करा' वर टॅप करा. आता शिक्षण व आरोग्य खर्चात यांचे नाव जोडता येईल.",
      ],
      example: {
        scenario: "मुलाच्या कॉलेज फीचा हिशोब",
        details: "मुलगा 'अनिकेत' चे नाव जोडले आणि त्याच्या कॉलेज फीचा ₹४५,००० खर्च त्याच्या नावावर नोंदवला.",
        result: "वर्षाअखेर अनिकेतच्या शिक्षणावर झालेला एकूण खर्च स्पष्ट दिसतो.",
      },
      expectedResult: "कुटुंबातील सर्व सदस्यांची सुंदर यादी तयार होते.",
      commonMistakes: [
        "एकाच व्यक्तीचे नाव दोनदा नोंदवणे.",
      ],
      faqs: [
        {
          q: "सदस्य हटवल्यास जुना खर्च पुसला जाईल का?",
          a: "नाही! जुन्या व्यवहारांचा हिशोब सुरक्षित राहतो, फक्त नवीन नोंदीत ते नाव दिसणार नाही.",
        },
      ],
      keywords: ["कुटुंब", "सदस्य", "नाते", "वाढदिवस", "शिक्षण", "घरखर्च"],
    },
  },

  {
    id: "expense-management",
    category: "money",
    categoryLabel: { en: "Expense Management", mr: "खर्च व्यवस्थापन" },
    icon: "Receipt",
    relatedIds: ["getting-started", "farm-management", "income-crop-sales"],
    en: {
      title: "Recording and Managing Expenses",
      shortExplanation: "Track home groceries, farm inputs, vehicle repairs, and day-to-day spending.",
      whyUseful: "Clear separation between household and farm spending reveals exactly where money flows and prevents cash leaks.",
      prerequisites: ["Account unlocked."],
      steps: [
        "Tap the '+' button from any screen or navigate to the 'Expenses' tab.",
        "Select Expense Group: Home, Farm, Vehicle, or Other.",
        "Enter amount in rupees (automatically converted to precise integer paise).",
        "Select Category (e.g., Groceries, Seeds, Diesel, Servicing, Medical).",
        "Choose Payment Method: Cash, UPI, Bank Transfer, or Card.",
        "Optionally tag a family member, crop, land, or vehicle.",
        "Tap 'Save' to immediately update your balance and expense reports.",
      ],
      example: {
        scenario: "Buying diesel for irrigation pump",
        details: "Group: Farm, Category: Diesel, Amount: ₹2,500, Payment: UPI, Land: River Plot.",
        result: "₹2,500 is debited from available balance and added to the farm operating cost.",
      },
      expectedResult: "The transaction appears instantly in your transaction ledger with category badge and timestamp.",
      commonMistakes: [
        "Mixing personal grocery costs under farm expenses.",
        "Entering rupee amount with comma symbols (the app formats automatically).",
      ],
      faqs: [
        {
          q: "Can I edit an expense if I entered the wrong amount?",
          a: "Yes. Tap on the transaction in 'Expenses' or 'All Transactions', edit the fields, and tap Save.",
        },
      ],
      troubleshooting: [
        {
          problem: "The balance decreased more than expected.",
          a: "Check if you entered the transaction twice or selected the wrong payment method.",
        },
      ],
      keywords: ["expenses", "spending", "groceries", "diesel", "upi", "cash", "ledger"],
    },
    mr: {
      title: "खर्चाची अचूक नोंद व व्यवस्थापन",
      shortExplanation: "घरखर्च, शेतीचा खर्च आणि वाहनांचा दैनंदिन हिशोब ठेवा.",
      whyUseful: "घरगुती खर्च आणि शेतीचा खर्च वेगळा राहिल्याने वर्षाअखेर शेती परवडली की नाही हे अचूक समजते.",
      prerequisites: ["ॲप अनलॉक असणे आवश्यक."],
      steps: [
        "मुख्य स्क्रीनवरील '+' बटनावर किंवा 'खर्च' टॅबवर टॅप करा.",
        "खर्चाचा प्रकार निवडा: घरगुती, शेती, वाहन किंवा इतर.",
        "रक्कम भरा (उदा. ₹२,५००). पैशांची अचूक गणना आपोआप होते.",
        "वर्गवारी निवडा (उदा. किराणा, खते, डिझेल, औषधोपचार, दुरुस्ती).",
        "पैसे कसे दिले ते निवडा: रोख (Cash), युपीआय (UPI), किंवा बँक खाते.",
        "लागू असल्यास संबंधित शेत, पीक किंवा कुटुंबातील सदस्य निवडा.",
        "'जतन करा' वर टॅप करा. शिल्लक रक्कम त्वरित कमी होईल.",
      ],
      example: {
        scenario: "पा पाण्याच्या पंपासाठी डिझेल खरेदी",
        details: "प्रकार: शेती, वर्गवारी: डिझेल, रक्कम: ₹२,५००, माध्यम: युपीआय, जमीन: विहिरीचे रान.",
        result: "शिल्लक रकमेतून ₹२,५०० वजा झाले आणि शेती खर्चात नोंद झाली.",
      },
      expectedResult: "खर्च नोंदवला जाऊन व्यवहारांच्या यादीत लगेच दिसेल.",
      commonMistakes: [
        "घरगुती किराणा शेती खर्चात नोंदवणे.",
        "रक्कम भरताना चुकीचे शून्य जास्त टाकणे.",
      ],
      faqs: [
        {
          q: "चुकलेली नोंद बदलता किंवा हटवता येते का?",
          a: "होय! व्यवहारावर टॅप करून तुम्ही कधीही रक्कम, तारीख किंवा वर्गवारी दुरुस्त करू शकता किंवा हटवू शकता.",
        },
      ],
      keywords: ["खर्च", "किराणा", "डिझेल", "शेती खर्च", "घरखर्च", "युपीआय", "रोख"],
    },
  },

  {
    id: "farm-management",
    category: "farm",
    categoryLabel: { en: "Farm & Land", mr: "शेतजमीन व्यवस्थापन" },
    icon: "MapPin",
    relatedIds: ["crop-management", "expense-management", "labour-management"],
    en: {
      title: "Farm and Land Parcel Management",
      shortExplanation: "Register your agricultural lands, surveys, acres, and gunthas.",
      whyUseful: "Form the foundation for all crop cycles, irrigation costs, and per-acre yield calculations.",
      prerequisites: ["Basic knowledge of your land survey numbers and area."],
      steps: [
        "Open the 'Farm' tab and tap 'Lands'.",
        "Tap 'Add Land'.",
        "Enter Land Name (e.g., 'Gat No. 42 / Canal Field'), total acres, and gunthas (1 Acre = 40 Gunthas).",
        "Specify soil type, water source (well, borewell, canal, drip), and ownership status.",
        "Save to create the land profile.",
      ],
      example: {
        scenario: "Adding a family farm parcel",
        details: "Name: 'River Side Farm', Area: 3 Acres 20 Gunthas, Water Source: Borewell + River Lift.",
        result: "Land is saved with total normalized area of 3.5 acres ready for crop assignment.",
      },
      expectedResult: "Your land appears on the Farm overview with active crop capacity.",
      commonMistakes: [
        "Confusing gunthas with decimal acres (20 gunthas is 0.50 acre, not 0.20 acre).",
      ],
      faqs: [
        {
          q: "Can I manage multiple plots or leased lands?",
          a: "Yes. Add as many owned or leased plots as needed. Each maintains its own crop history.",
        },
      ],
      troubleshooting: [
        {
          problem: "Land area shows decimal values.",
          a: "Personal Bank displays both total acres and gunthas (40 gunthas per acre) for precision.",
        },
      ],
      keywords: ["farm", "land", "acres", "guntha", "gat number", "soil", "irrigation"],
    },
    mr: {
      title: "शेतजमीन व गट नोंदणी",
      shortExplanation: "तुमची शेतजमीन, गट नंबर, एकर आणि गुंठ्यांची नोंद ठेवा.",
      whyUseful: "कोणत्या रानात कोणते पीक घेतले आणि कोणत्या जमिनीवर किती खर्च झाला हे पाहण्यासाठी जमीन नोंदवणे आवश्यक आहे.",
      prerequisites: ["जमिनीचे एकर व गुंठे क्षेत्रफळ माहिती असणे."],
      steps: [
        "'शेती' (Farm) टॅबवर जाऊन 'शेतजमीन' (Lands) निवडा.",
        "'जमीन जोडा' (Add Land) वर टॅप करा.",
        "जमिनीचे नाव किंवा गट नंबर लिहा (उदा. गट क्र. १४२ / विहिरीचे रान).",
        "क्षेत्रफळ भरा: एकर आणि गुंठे (१ एकर = ४० गुंठे).",
        "पाण्याची सोय (विहीर, कूपनलिका, कालवा, ठिबक) आणि मालकी प्रकार निवडा.",
        "'जतन करा' वर टॅप करा.",
      ],
      example: {
        scenario: "नदीकाठची जमीन नोंदवणे",
        details: "नाव: नदीकाठचे शेत, क्षेत्र: २ एकर २० गुंठे, पाण्याचा स्रोत: विहीर व नदी उपसा.",
        result: "एकूण २.५ एकर जमीन तयार झाली आणि पिकांच्या नियोजनासाठी उपलब्ध झाली.",
      },
      expectedResult: "तुमच्या शेतजमिनीचे कार्ड शेती टॅबवर सक्रिय दिसेल.",
      commonMistakes: [
        "गुंठ्याची नोंद करताना २० गुंठ्याला ०.२० एकर समजणे (२० गुंठे म्हणजे अर्धा एकर).",
      ],
      faqs: [
        {
          q: "स्वतःची आणि खंडाने (बटईने) घेतलेली जमीन वेगवेगळी ठेवता येते का?",
          a: "होय! तुम्ही स्वतःच्या व खंडाने केलेल्या प्रत्येक तुकड्याची स्वतंत्र नोंद करू शकता.",
        },
      ],
      keywords: ["शेतजमीन", "गट नंबर", "एकर", "गुंठे", "विहीर", "ठिबक", "शेती"],
    },
  },

  {
    id: "crop-management",
    category: "farm",
    categoryLabel: { en: "Crop Cycles", mr: "पीक नियोजन व नफा" },
    icon: "Sprout",
    relatedIds: ["farm-management", "income-crop-sales", "labour-management", "inventory-management"],
    en: {
      title: "Crop Management and Profitability Tracking",
      shortExplanation: "Track sowing, season, field costs, harvest yield, and true net crop profit.",
      whyUseful: "Calculates the exact cost of seeds, fertilizers, labour, tractor, and water against total crop income to show whether you made a profit or loss.",
      prerequisites: ["At least one Land parcel registered."],
      steps: [
        "Go to Farm > Crops > tap 'Add Crop'.",
        "Select the Land parcel and enter Crop Name (e.g., Sugarcane 86032, Soybeans, Onions, Wheat).",
        "Enter Season (Kharif, Rabi, Zaid / Summer) and Sowing Date.",
        "Specify cultivated area in acres/gunthas and expected harvest date.",
        "During the crop cycle, link all fertilizer, labour, diesel, and spray expenses to this crop.",
        "Upon harvest, record total yield (quintals, tons, crates) and mark the crop as Completed.",
      ],
      example: {
        scenario: "Onion crop cycle financial tracking",
        details: "Crop: Red Onions on 2 Acres. Total input expenses: ₹68,000. Harvest yield: 140 Quintals. Crop sales: ₹1,82,000.",
        result: "Net Profit calculated as ₹1,14,000 (Revenue ₹1,82,000 minus Costs ₹68,000).",
      },
      expectedResult: "A detailed Crop Financial Card displaying live revenue, total expenses, and profit margin.",
      commonMistakes: [
        "Forgetting to link daily labour payments or fertilizer bags to the crop.",
      ],
      faqs: [
        {
          q: "Can I track multi-year crops like Sugarcane or Pomegranate?",
          a: "Yes. Crops can span multiple seasons and remain active until the final cutting or harvest is recorded.",
        },
      ],
      troubleshooting: [
        {
          problem: "Crop profit shows negative value.",
          a: "This is normal during growing season before crop sales are recorded.",
        },
      ],
      keywords: ["crop", "sowing", "harvest", "profit", "loss", "kharif", "rabi", "yield"],
    },
    mr: {
      title: "पीक नियोजन, काढणी व नफा-तोटा हिशोब",
      shortExplanation: "पेरणी, हंगाम, झालेला खर्च, मिळालेले उत्पादन आणि निव्वळ नफ्याची संपूर्ण माहिती.",
      whyUseful: "बियाणे, खते, मजुरी व ट्रॅक्टर यावर किती खर्च झाला आणि पीक विकून किती नफा झाला हे रुपयान्-रुपया समजते.",
      prerequisites: ["किमान एक शेतजमीन नोंदवलेली असणे."],
      steps: [
        "'शेती' टॅबमध्ये 'पिके' (Crops) वर जाऊन 'पीक जोडा' (Add Crop) दाबा.",
        "जमीन निवडा आणि पिकाचे नाव लिहा (उदा. उसाची जात ८६०३२, सोयाबीन, कांदा, गहू).",
        "हंगाम निवडा (खरीप, रब्बी किंवा उन्हाळी) आणि पेरणीची अचूक तारीख टाका.",
        "क्षेत्रफळ (एकर/गुंठे) आणि काढणीची अंदाजे तारीख भरा.",
        "पीक उभे असताना होणारा सर्व खत, फवारणी, मजुरी व ट्रॅक्टर खर्च या पिकाशी जोडा.",
        "काढणी झाल्यावर मिळालेले उत्पादन (क्विंटल/टन) नोंदवा आणि पीक पूर्ण करा.",
      ],
      example: {
        scenario: "२ एकर कांदा पिकाचा हिशोब",
        details: "पीक: कांदा, एकर: २. खते, औषधे, मजुरी असा एकूण खर्च: ₹६८,०००. उत्पादन: १४० क्विंटल. विक्रीतून मिळालेले पैसे: ₹१,८२,०००.",
        result: "निव्वळ नफा = ₹१,१४,००० (उत्पन्न ₹१,८२,००० वजा खर्च ₹६८,०००).",
      },
      expectedResult: "पिकाच्या पानावर झालेला एकूण खर्च, विक्री आणि नफा स्पष्ट आकडेवारीत दिसेल.",
      commonMistakes: [
        "मजुरीचा किंवा खताचा खर्च पिकाला लिंक न करणे.",
      ],
      faqs: [
        {
          q: "ऊस किंवा डाळिंबासारख्या दीर्घकालीन पिकांचा हिशोब ठेवता येतो का?",
          a: "होय! ऊस किंवा बागायती पिके अनेक महिने चालतात, शेवटचे बिल येईपर्यंत पीक चालू ठेवता येते.",
        },
      ],
      keywords: ["पीक", "पेरणी", "काढणी", "नफा", "तोटा", "सोयाबीन", "कांदा", "ऊस"],
    },
  },

  {
    id: "income-crop-sales",
    category: "money",
    categoryLabel: { en: "Income & Sales", mr: "उत्पन्न व पीक विक्री" },
    icon: "ArrowDownLeft",
    relatedIds: ["crop-management", "expense-management", "reports-and-analysis"],
    en: {
      title: "Recording Income and Crop Sales",
      shortExplanation: "Track crop sale proceeds, milk income, tractor rental receipts, and pending receivables.",
      whyUseful: "Handles partial payments from traders (Adat/Vyapari) and keeps track of unpaid balances owed to your family.",
      prerequisites: ["Crop registered if recording crop sales."],
      steps: [
        "Tap '+' button and select 'Income' or 'Crop Sale'.",
        "Choose category: Crop Sales, Milk Sales, Tractor Rental, Salary, or Other Farm Income.",
        "If Crop Sale: select the Crop, buyer/merchant name, quantity sold, and rate per unit.",
        "Enter Total Amount and the Amount Actually Received today.",
        "Any remaining unpaid balance is automatically logged as a Pending Receivable owed to you.",
        "Select deposit destination: Cash in hand or Bank account.",
      ],
      example: {
        scenario: "Selling soybeans to a local trader with partial payment",
        details: "Total Soybeans: 40 Quintals at ₹4,200 = ₹1,68,000. Merchant pays ₹1,00,000 via NEFT, ₹68,000 due in 15 days.",
        result: "Bank balance increases by ₹1,00,000. Outstanding Receivable shows ₹68,000 owed by trader.",
      },
      expectedResult: "Income is recorded, crop revenue is credited, and pending receivables appear on the dashboard.",
      commonMistakes: [
        "Marking the full amount as received when the trader only gave an advance payment.",
      ],
      faqs: [
        {
          q: "How do I record the remaining payment when the trader pays later?",
          a: "Open the crop sale transaction and add the received installment to clear the receivable.",
        },
      ],
      troubleshooting: [
        {
          problem: "Receivables total is higher than expected.",
          a: "Check pending crop sales for unpaid balances that were already received in cash.",
        },
      ],
      keywords: ["income", "crop sale", "merchant", "receivable", "advance", "soybean", "milk"],
    },
    mr: {
      title: "उत्पन्न व पीक विक्री हिशोब",
      shortExplanation: "पीक विक्री, दूध बिल, ट्रॅक्टर भाडे आणि व्यापाऱ्याकडील बाकी पैशांची अचूक नोंद.",
      whyUseful: "व्यापाऱ्याने (आडत्याने) दिलेली उचल (ॲडव्हान्स) आणि बाकी राहिलेले पैसे (येणे बाकी) यांचा अचूक हिशोब राहतो.",
      prerequisites: ["पीक विक्री नोंदवण्यासाठी पीक अगोदर जोडलेले असणे."],
      steps: [
        "'+' बटनावर टॅप करा आणि 'उत्पन्न' (Income) किंवा 'पीक विक्री' निवडा.",
        "वर्गवारी निवडा: पीक विक्री, दूध बिल, ट्रॅक्टर भाडे, पगार इत्यादी.",
        "पीक विक्री असल्यास: पीक, व्यापाऱ्याचे नाव, विकलेले वजन आणि भाव भरा.",
        "एकूण बिल आणि आज प्रत्यक्षात मिळालेले पैसे भरा.",
        "बाकी राहिलेली रक्कम आपोआप 'येणे बाकी' (Receivable) म्हणून नोंदवली जाईल.",
        "पैसे रोख आले की बँकेत ते निवडून जतन करा.",
      ],
      example: {
        scenario: "सोयाबीन विक्री आणि बाकी पैशांची नोंद",
        details: "एकूण सोयाबीन: ४० क्विंटल x ₹४,२०० = ₹१,६८,०००. व्यापाऱ्याने बँकेत ₹१,००,००० दिले, ₹६८,००० पंधरा दिवसांनी देण्याचे ठरले.",
        result: "बँक खात्यात ₹१,००,००० जमा झाले आणि व्यापाऱ्याकडे येणे बाकी ₹६८,००० दिसू लागले.",
      },
      expectedResult: "उत्पन्नाची नोंद होईल आणि बाकी पैसे येणे बाकीच्या यादीत दिसतील.",
      commonMistakes: [
        "उचल मिळाली असताना पूर्ण बिल आल्याचे दाखवणे.",
      ],
      faqs: [
        {
          q: "व्यापाऱ्याने नंतर बाकी पैसे दिल्यावर कशी नोंद करावी?",
          a: "त्या पीक विक्री नोंदीवर जाऊन मिळालेले उर्वरित पैसे भरा, येणे बाकी आपोआप शून्य होईल.",
        },
      ],
      keywords: ["उत्पन्न", "पीक विक्री", "व्यापारी", "आडत", "येणे बाकी", "दूध बिल", "सोयाबीन"],
    },
  },

  {
    id: "labour-management",
    category: "management",
    categoryLabel: { en: "Labour & Wages", mr: "मजूर व मजुरी" },
    icon: "Users2",
    relatedIds: ["crop-management", "expense-management"],
    en: {
      title: "Agricultural Labour and Wage Tracking",
      shortExplanation: "Track daily farm labourers, weeding/harvesting tasks, daily wage rates, and unpaid wages.",
      whyUseful: "Calculates total daily wage bills, tracks paid vs unpaid amounts to labour leaders (Mukadam), and assigns costs directly to crops.",
      prerequisites: ["Crop or farm land registered."],
      steps: [
        "Go to More > Labour > tap 'Record Labour'.",
        "Select Crop or Land where work was performed.",
        "Choose activity: Sowing, Weeding, Spraying, Harvesting, Pruning, Irrigation, or Other.",
        "Enter number of workers, working days, and wage rate per worker per day.",
        "The app computes Total Wage = Workers × Days × Daily Rate.",
        "Enter amount paid immediately and any remaining unpaid wage obligation.",
      ],
      example: {
        scenario: "Cotton picking labour payment",
        details: "Activity: Harvesting, Workers: 8 women, Days: 2, Daily Rate: ₹350. Total Wages = 8 × 2 × 350 = ₹5,600. Paid ₹3,000 cash, ₹2,600 pending.",
        result: "₹3,000 deducted from cash, ₹2,600 logged as Pending Wage Payable, ₹5,600 debited to Cotton crop cost.",
      },
      expectedResult: "Labour records update pending payables and reflect accurately in crop cost sheets.",
      commonMistakes: [
        "Entering total lump sum instead of per-worker rate and worker count.",
      ],
      faqs: [
        {
          q: "Can I record male and female wage rates separately?",
          a: "Yes. Simply record two separate labour entries for the day with their respective headcounts and rates.",
        },
      ],
      troubleshooting: [
        {
          problem: "Pending labour wages still show after paying.",
          a: "Open the labour log and record a wage payment to clear the pending balance.",
        },
      ],
      keywords: ["labour", "wages", "workers", "weeding", "harvesting", "mukadam", "daily rate"],
    },
    mr: {
      title: "मजूर, हजेरी व रोजंदारी हिशोब",
      shortExplanation: "खुरपणी, काढणी, फवारणी मजुरांची संख्या, रोजंदारी दर आणि देणे बाकी मजुरीची नोंद.",
      whyUseful: "मुकादमाला किंवा मजुरांना किती मजुरी दिली आणि किती बाकी आहे याचा स्पष्ट हिशोब राहतो.",
      prerequisites: ["शेती किंवा पीक अगोदर जोडलेले असणे."],
      steps: [
        "'अधिक' मध्ये जाऊन 'मजूर व मजुरी' (Labour) वर टॅप करा.",
        "'मजुरी नोंदवा' निवडा आणि काम झालेले पीक किंवा शेत निवडा.",
        "कामाचा प्रकार निवडा: पेरणी, खुरपणी, फवारणी, काढणी, तोडणी किंवा इतर कामे.",
        "मजूर संख्या, कामाचे दिवस आणि प्रति मजूर रोजंदारी भरा.",
        "ॲप आपोआप हिशोब करेल: एकूण मजुरी = मजूर x दिवस x रोजंदारी दर.",
        "आज प्रत्यक्षात दिलेली रक्कम भरा; बाकी रक्कम आपोआप 'बाकी मजुरी' मध्ये नोंदवली जाईल.",
      ],
      example: {
        scenario: "कापूस वेचणी मजुरी हिशोब",
        details: "काम: वेचणी, मजूर: ८ महिला, दिवस: २, रोजंदारी: ₹३५०. एकूण मजुरी = ₹५,६००. रोख दिले: ₹३,०००, बाकी राहिले: ₹२,६००.",
        result: "रोख शिल्लक ₹३,००० ने कमी झाली, कापूस पिकाच्या खर्चात ₹५,६०० जोडले गेले आणि देणे बाकी मजुरी ₹२,६०० दिसू लागली.",
      },
      expectedResult: "मजुरीची अचूक नोंद होईल आणि पिकाच्या खर्चात मजुरी समाविष्ट होईल.",
      commonMistakes: [
        "एकूण मजुरी आणि प्रति मजूर दर यात गल्लत करणे.",
      ],
      faqs: [
        {
          q: "उरलेली मजुरी नंतर दिल्यावर कशी मिटवावी?",
          a: "त्या मजुरी नोंदीवर जाऊन 'मजुरी वाटप' (Record Payment) नोंदवा, बाकी मजुरी शून्य होईल.",
        },
      ],
      keywords: ["मजूर", "मजुरी", "रोजंदारी", "हजेरी", "खुरपणी", "काढणी", "मुकादम"],
    },
  },

  {
    id: "vehicle-tractor-management",
    category: "farm",
    categoryLabel: { en: "Vehicles & Machinery", mr: "वाहने व ट्रॅक्टर" },
    icon: "Tractor",
    relatedIds: ["expense-management", "income-crop-sales"],
    en: {
      title: "Vehicle and Tractor Management",
      shortExplanation: "Track tractors, motorcycles, cars, diesel consumption, service logs, and custom hiring income.",
      whyUseful: "Gives complete visibility into vehicle maintenance bills and tracks profit from renting out your tractor to other farmers.",
      prerequisites: ["Register vehicle name and registration number."],
      steps: [
        "Go to More > Vehicles > tap 'Add Vehicle'.",
        "Choose vehicle type: Tractor, Motorcycle, Car, Harvester, or Other.",
        "Enter vehicle model, registration number, and purchase year.",
        "To record fuel/servicing: tap on the vehicle and select 'Record Service / Fuel'.",
        "To record rental work: tap 'Record Tractor Work Log' and enter farmer name, hours worked, hourly rate, and rental collected.",
      ],
      example: {
        scenario: "Tractor rotavator work for another farmer",
        details: "Tractor: Mahindra 575 DI. Work: Rotavator, 5 hours at ₹900/hr = ₹4,500. Diesel used: 18 litres (₹1,700).",
        result: "Gross rental income ₹4,500 recorded, fuel cost ₹1,700 logged, net tractor hiring profit = ₹2,800.",
      },
      expectedResult: "Vehicle profile tracks total operating cost, rental earnings, and service reminders.",
      commonMistakes: [
        "Forgetting to enter tractor meter/hour reading during oil changes.",
      ],
      faqs: [
        {
          q: "Can I track vehicle loan EMI here?",
          a: "Yes. Record the vehicle loan in the Loans module, and payments will link to vehicle history.",
        },
      ],
      troubleshooting: [
        {
          problem: "Service reminder is not showing.",
          a: "Make sure you entered next service date or meter hours when saving the service record.",
        },
      ],
      keywords: ["tractor", "vehicle", "diesel", "rotavator", "custom hiring", "service", "maintenance"],
    },
    mr: {
      title: "वाहने, ट्रॅक्टर व अवजारे व्यवस्थापन",
      shortExplanation: "ट्रॅक्टर, मोटारसायकल, डिझेल खर्च, दुरुस्ती आणि ट्रॅक्टर भाड्याचे (कस्टम हायरिंग) उत्पन्न.",
      whyUseful: "ट्रॅक्टर चालवून किती नफा झाला आणि वर्षभरात वाहनांच्या डिझेल व मेंटेनन्सवर किती खर्च झाला हे स्पष्ट समजते.",
      prerequisites: ["वाहनाचा प्रकार व नंबर माहिती असणे."],
      steps: [
        "'अधिक' मध्ये जाऊन 'वाहने व ट्रॅक्टर' (Vehicles) निवडा.",
        "'वाहन जोडा' वर टॅप करा आणि प्रकार निवडा: ट्रॅक्टर, दुचाकी, चारचाकी इत्यादी.",
        "वाहनाचे नाव, नंबर आणि खरेदी वर्ष भरा.",
        "डिझेल किंवा दुरुस्तीसाठी: वाहनावर टॅप करून 'दुरुस्ती / इंधन नोंदवा' निवडा.",
        "दुसऱ्याच्या शेतात रोटाव्हेटर/नांगरणी केल्यास: 'ट्रॅक्टर काम नोंद' (Work Log) निवडा, तास व प्रति तास भाडे भरून भाडे जमा करा.",
      ],
      example: {
        scenario: "दुसऱ्या शेतकऱ्याच्या रानात रोटाव्हेटरचे काम",
        details: "ट्रॅक्टर: महिंद्रा ५७५. काम: रोटाव्हेटर, ५ तास x ₹९०० = ₹४,५००. डिझेल खर्च: ₹१,७००.",
        result: "भाडे उत्पन्न ₹४,५०० जमा झाले, डिझेल वजा जाता निव्वळ शिल्लक ₹२,८०० राहिली.",
      },
      expectedResult: "वाहनाच्या पानावर एकूण झालेला खर्च, भाड्याचे उत्पन्न आणि सर्विसिंगचा इतिहास दिसेल.",
      commonMistakes: [
        "ट्रॅक्टर भाड्याने चालवताना डिझेल खर्चाची स्वतंत्र नोंद न करणे.",
      ],
      faqs: [
        {
          q: "ट्रॅक्टरच्या कर्जाचा हप्ता कसा नोंदवावा?",
          a: "'कर्ज' (Loans) विभागात ट्रॅक्टरचे कर्ज नोंदवून दरमहा हप्ता नोंदवू शकता.",
        },
      ],
      keywords: ["ट्रॅक्टर", "वाहन", "डिझेल", "रोटाव्हेटर", "भाडे", "दुरुस्ती", "ऑइल"],
    },
  },

  {
    id: "loans-and-lending",
    category: "money",
    categoryLabel: { en: "Loans & Lending", mr: "कर्ज व उधारी" },
    icon: "Landmark",
    relatedIds: ["expense-management", "income-crop-sales", "reports-and-analysis"],
    en: {
      title: "Loans and Money Lending Management",
      shortExplanation: "Track borrowed bank loans/crop credit (KCC) and personal money lent to friends or relatives.",
      whyUseful: "Distinguishes money you owe others (Payables) from money others owe you (Receivables), protecting against forgotten debts.",
      prerequisites: ["Loan details, principal amount, and repayment terms."],
      steps: [
        "To record money you borrowed: Go to More > Loans > tap 'Record Borrowed Loan'. Enter lender name (e.g., Bank of Maharashtra KCC), principal, interest rate, and due date.",
        "To record money you lent to someone: Go to More > Money Lent > tap 'Record Money Lent'. Enter borrower name, amount, and expected return date.",
        "When making or receiving repayments: Open the loan record and tap 'Record Repayment'.",
        "The app automatically decreases the outstanding principal and updates your cash/bank balance.",
      ],
      example: {
        scenario: "Repaying Kisan Credit Card (KCC) loan",
        details: "KCC Principal: ₹1,50,000. Made repayment of ₹50,000 from crop sale proceeds.",
        result: "Outstanding KCC balance reduces to ₹1,00,000. Bank balance reduces by ₹50,000.",
      },
      expectedResult: "Accurate debt balances, principal tracking, and financial net worth calculation.",
      commonMistakes: [
        "Recording a loan repayment as a general expense without linking it to the loan.",
      ],
      faqs: [
        {
          q: "How does borrowed money affect my Net Worth?",
          a: "The loan balance is counted as a financial liability (Payable) and subtracted from total assets.",
        },
      ],
      troubleshooting: [
        {
          problem: "Loan still shows active after full payment.",
          a: "Ensure the total sum of repayments equals the principal amount so status changes to 'Completed'.",
        },
      ],
      keywords: ["loan", "lending", "kcc", "bank loan", "interest", "principal", "repayment", "debt"],
    },
    mr: {
      title: "घेतलेले कर्ज व दिलेली उधारी",
      shortExplanation: "बँक कर्ज, पीक कर्ज (KCC), सोसायट्यांचे कर्ज आणि मित्रांना दिलेली उसनवारी यांचा ताळेबंद.",
      whyUseful: "आपल्याला कोणाचे किती देणे आहे आणि कोणाकडून किती पैसे येणे बाकी आहे हे एका दृष्टिक्षेपात स्पष्ट समजते.",
      prerequisites: ["कर्जाची मुद्दल व व्याजदर माहिती असणे."],
      steps: [
        "घेतलेल्या कर्जासाठी: 'अधिक' > 'घेतलेले कर्ज' (Loans) > 'घेतलेले कर्ज नोंदवा'. बँक किंवा सावकाराचे नाव, मुद्दल व व्याजदर भरा.",
        "दिलेल्या उसनवारीसाठी: 'अधिक' > 'दिलेले पैसे' (Money Lent) > 'दिलेले पैसे नोंदवा'. व्यक्तीचे नाव, दिलेली रक्कम व परत येण्याची तारीख भरा.",
        "हप्ता किंवा परतफेड केल्यावर: त्या कर्जावर टॅप करा आणि 'हप्ता / परतफेड नोंदवा' निवडा.",
        "मुद्दल रक्कम आपोआप कमी होईल आणि बँक/रोख शिलकीशी ताळमेळ बसेल.",
      ],
      example: {
        scenario: "सोसायटीच्या पीक कर्जाचा हप्ता भरणे",
        details: "सोसायटी कर्ज: ₹१,००,०००. कांदा विक्रीतून ₹४०,००० चा हप्ता भरला.",
        result: "बाकी मुद्दल ₹६०,००० राहिली आणि बँक खात्यातून ₹४०,००० कमी झाले.",
      },
      expectedResult: "कर्जाचा अचूक हिशोब राहतो आणि अनावधानाने हप्ता भरणे चुकत नाही.",
      commonMistakes: [
        "कर्जाचा हप्ता साध्या खर्चात नोंदवणे (कर्जाला लिंक न करणे).",
      ],
      faqs: [
        {
          q: "उसनवारीचे पैसे परत आल्यावर कशी नोंद करावी?",
          a: "'दिलेले पैसे' मध्ये जाऊन त्या व्यक्तीच्या नोंदीवर 'परतफेड' नोंदवा, येणे बाकी संपेल.",
        },
      ],
      keywords: ["कर्ज", "पीक कर्ज", "उधारी", "उसनवारी", "सोसायटी", "मुद्दल", "व्याज", "हप्ता"],
    },
  },

  {
    id: "inventory-management",
    category: "management",
    categoryLabel: { en: "Stock & Inventory", mr: "शेती साठा व साहित्य" },
    icon: "Package",
    relatedIds: ["crop-management", "expense-management"],
    en: {
      title: "Inventory and Agricultural Stock Management",
      shortExplanation: "Track seeds, fertilizers, pesticides, diesel, and equipment in store.",
      whyUseful: "Prevents duplicate purchases, monitors remaining stock levels, and logs material usage directly into crop costs.",
      prerequisites: ["Inventory items or purchased materials."],
      steps: [
        "Go to More > Inventory > tap 'Add Stock Item'.",
        "Choose category: Seeds, Fertilizers, Pesticides, Fuel, Equipment, Animal Feed, or Other.",
        "Enter Item Name (e.g., 10:26:26 NPK, Urea, Chlorpyrifos), Unit (Bags, Kg, Litres, Bottles), and Reorder Alert Level.",
        "When buying new stock: tap 'Record Purchase' to update quantity and record the expense.",
        "When using stock in the field: tap 'Record Usage', enter quantity applied, and select the target Crop.",
      ],
      example: {
        scenario: "Purchasing 10 bags of Urea and applying 4 bags to Sugarcane",
        details: "Purchase: 10 bags @ ₹270 = ₹2,700. Usage: 4 bags taken to Sugarcane plot.",
        result: "Remaining Stock: 6 bags (Value ₹1,620). Sugarcane crop cost increased by ₹1,080.",
      },
      expectedResult: "Inventory keeps real-time stock balance, valuation, and alerts you when stock is low.",
      commonMistakes: [
        "Using items in the field without recording stock usage, leading to inaccurate remaining count.",
      ],
      faqs: [
        {
          q: "Does recording a purchase automatically deduct money from balance?",
          a: "Yes. Stock purchases automatically create an inventory expense transaction.",
        },
      ],
      troubleshooting: [
        {
          problem: "Physical stock does not match the app count.",
          a: "Use 'Adjust Stock' to perform a physical inventory audit and correct the number.",
        },
      ],
      keywords: ["inventory", "stock", "fertilizer", "seeds", "urea", "pesticides", "bags", "usage"],
    },
    mr: {
      title: "शेती साठा, खते व बियाणे व्यवस्थापन",
      shortExplanation: "घरातील बियाणे, खतांच्या गोण्या, कीटकनाशके व डिझेल साठ्याचा अचूक हिशोब.",
      whyUseful: "खतांची किंवा औषधांची विनाकारण दुबार खरेदी टळते आणि पिकाला प्रत्यक्ष किती खत लागले याचा खर्च कळतो.",
      prerequisites: ["साहित्याचे नाव व प्रमाण माहिती असणे."],
      steps: [
        "'अधिक' मध्ये जाऊन 'शेती साठा व साहित्य' (Inventory) निवडा.",
        "'साहित्य जोडा' वर टॅप करा आणि वर्गवारी निवडा: बियाणे, खते, कीटकनाशके, इंधन किंवा अवजारे.",
        "साहित्याचे नाव (उदा. १०:२६:२६ खत, युरिया), मोजमाप एकक (गोणी, किलो, लिटर) आणि किमान मर्यादा भरा.",
        "दुकानातून नवीन खत आणल्यावर: 'खरेदी नोंदवा' निवडा (खर्च आपोआप नोंदवला जाईल).",
        "शेतात खत किंवा औषध वापरल्यावर: 'वापर नोंदवा' निवडा, वापरलेले प्रमाण टाका आणि पीक निवडा.",
      ],
      example: {
        scenario: "१० गोण्या युरिया आणून ४ गोण्या उसाला देणे",
        details: "खरेदी: १० गोण्या @ ₹२७० = ₹२,७००. वापर: ४ गोण्या उसाच्या शेतात टाकल्या.",
        result: "गोदामात ६ गोण्या शिल्लक राहिल्या आणि उसाच्या खर्चात ४ गोण्यांची किंमत (₹१,०८०) जोडली गेली.",
      },
      expectedResult: "साठ्याची अचूक शिल्लक दिसेल आणि खत संपत आल्यावर लाल अलर्ट दिसेल.",
      commonMistakes: [
        "शेतात खत वापरल्यावर ॲपमध्ये वापर नोंदवायचे विसरणे.",
      ],
      faqs: [
        {
          q: "गोदामात प्रत्यक्ष मोजणी करताना कमी-जास्त आढळल्यास काय करावे?",
          a: "'साठा दुरुस्त करा' (Adjust Stock) पर्याय वापरून प्रत्यक्ष मोजणीनुसार संख्या दुरुस्त करता येते.",
        },
      ],
      keywords: ["साठा", "खत", "बियाणे", "गोणी", "युरिया", "औषध", "कीटकनाशक", "शिल्लक"],
    },
  },

  {
    id: "reports-and-analysis",
    category: "system",
    categoryLabel: { en: "Reports & Intelligence", mr: "आर्थिक अहवाल व ताळेबंद" },
    icon: "BarChart3",
    relatedIds: ["getting-started", "crop-management", "expense-management"],
    en: {
      title: "Financial Intelligence, Reports and Reconciliation",
      shortExplanation: "Understand cash flow, monthly spending, crop profitability, and ledger reconciliation.",
      whyUseful: "Gives a transparent picture of family net worth, farm profitability, and verifies that ledger calculations are 100% mathematically balanced.",
      prerequisites: ["At least several transactions recorded in the app."],
      steps: [
        "Open the 'Reports' tab from the bottom navigation bar.",
        "Select period filter: This Month, Last Month, Financial Year, or Custom date range.",
        "Inspect Category Breakdown charts to see where the biggest expenses occurred.",
        "Review Crop Profitability summary to compare which crops made the highest net profit per acre.",
        "Go to More > Reconciliation to perform an automated ledger balance audit verifying credits, debits, and integrity.",
      ],
      example: {
        scenario: "Annual financial year review for family planning",
        details: "Total Income: ₹8,40,000. Household Expenses: ₹2,10,000. Farm Expenses: ₹3,60,000. Outstanding Loans: ₹1,50,000.",
        result: "Family Net Savings = ₹2,70,000. Farm Profit Margin = 38%. Clear roadmap for next year's crop investments.",
      },
      expectedResult: "Clear charts, summaries, and downloadable PDF/CSV audit reports.",
      commonMistakes: [
        "Comparing calendar year with financial year without adjusting date filters.",
      ],
      faqs: [
        {
          q: "Can I export these reports to Excel or PDF?",
          a: "Yes. Use the Export button to save CSV spreadsheets or print formatted reports.",
        },
      ],
      troubleshooting: [
        {
          problem: "Reconciliation displays an integrity warning.",
          a: "Run a full cloud sync or verify that manual adjustments have matching contra-entries.",
        },
      ],
      keywords: ["reports", "financial report", "reconciliation", "profit", "net worth", "cash flow", "audit"],
    },
    mr: {
      title: "आर्थिक अहवाल, नफा-तोटा व ताळेबंद",
      shortExplanation: "मासिक खर्च, शेतीचा निव्वळ नफा, येणे-देणे आणि संपूर्ण आर्थिक ताळेबंद पहा.",
      whyUseful: "वर्षाअखेर कुटुंबाची एकूण बचत किती झाली आणि कोणकोणत्या पिकाने सर्वाधिक नफा दिला हे स्पष्ट समजते.",
      prerequisites: ["ॲपमध्ये खर्च व उत्पन्नाच्या काही नोंदी असणे."],
      steps: [
        "खालील मेनूतील 'अहवाल' (Reports) टॅबवर टॅप करा.",
        "कालावधी निवडा: चालू महिना, मागील महिना, चालू वर्ष किंवा आवडीचा काळ.",
        "खर्चाचा आलेख पाहून घर, शेती आणि वाहनांवर किती टक्के खर्च झाला ते तपासा.",
        "पीक नफा सारांश पाहून कोणत्या पिकाने सर्वाधिक नफा मिळवून दिला त्याची तुलना करा.",
        "'अधिक' > 'हिशोब पडताळणी' (Reconciliation) मध्ये जाऊन खात्याचा ताळेबंद तपासा.",
      ],
      example: {
        scenario: "वर्षाअखेर कुटुंबाचा आर्थिक आढावा",
        details: "एकूण उत्पन्न: ₹८,४०,०००. घरखर्च: ₹२,१०,०००. शेती खर्च: ₹३,६०,०००. बाकी कर्ज: ₹१,५०,०००.",
        result: "कुटुंबाची निव्वळ बचत = ₹२,७०,०००. शेतीचा नफा दर = ३८%. पुढील वर्षाच्या नियोजनासाठी मजबूत आधार.",
      },
      expectedResult: "सुंदर रंगीबेरंगी आलेख आणि अचूक ताळेबंद समोर दिसेल.",
      commonMistakes: [
        "कालावधी फिल्टर न निवडता संपूर्ण वर्षाचा हिशोब एका महिन्याचा समजणे.",
      ],
      faqs: [
        {
          q: "हा अहवाल एक्सेल किंवा प्रिंटसाठी काढता येतो का?",
          a: "होय! अहवाल पानावरून तुम्ही एक्सेल (CSV) फाईल डाऊनलोड करू शकता किंवा प्रिंट काढू शकता.",
        },
      ],
      keywords: ["अहवाल", "ताळेबंद", "नफा", "तोटा", "बचत", "खर्च", "पडताळणी", "वार्षिक हिशोब"],
    },
  },

  {
    id: "reminders",
    category: "basics",
    categoryLabel: { en: "Reminders & Dates", mr: "स्मरणपत्रे व तारखा" },
    icon: "Bell",
    relatedIds: ["getting-started", "crop-management", "loans-and-lending"],
    en: {
      title: "Important Dates and Timely Reminders",
      shortExplanation: "Never miss an electricity bill, loan EMI deadline, medicine spray, or family event.",
      whyUseful: "Prevents late fees on electricity bills, loan interest penalties, and timely crop maintenance reminders.",
      prerequisites: ["Due date and reminder title."],
      steps: [
        "Go to More > Important Dates > tap 'Add Reminder'.",
        "Enter Reminder Title (e.g., 'MSEDCL Farm Power Bill', 'Sugarcane Second Spraying', 'Tractor Loan EMI').",
        "Set Due Date and optional recurrence (Once, Weekly, Monthly, Yearly).",
        "Link to a Crop, Vehicle, Loan, or Family Member if applicable.",
        "When task is completed, tap 'Mark as Done'.",
      ],
      example: {
        scenario: "Monthly farm electricity bill reminder",
        details: "Title: 'Well Electricity Bill', Due: 10th of every month, Recurrence: Monthly.",
        result: "Reminder surfaces on the dashboard before the due date so power connection is never disconnected.",
      },
      expectedResult: "Active reminders appear on the Home dashboard with urgent badges for items due today.",
      commonMistakes: [
        "Setting a one-time reminder for recurring monthly bills.",
      ],
      faqs: [
        {
          q: "Do I get sound alerts?",
          a: "If browser notifications are enabled in Settings, the app alerts you when due dates arrive.",
        },
      ],
      troubleshooting: [
        {
          problem: "Notifications do not pop up.",
          a: "Check phone browser permissions to ensure notifications are allowed for Personal Bank.",
        },
      ],
      keywords: ["reminder", "dates", "electricity bill", "emi", "spraying", "due date", "birthday"],
    },
    mr: {
      title: "महत्त्वाच्या तारखा व स्मरणपत्रे",
      shortExplanation: "लाईट बिल, कर्जाचा हप्ता, औषध फवारणी व घरगुती तारखांचे वेळेवर स्मरण ठेवा.",
      whyUseful: "लाईट बिल उशिरा भरल्याने वीज खंडित होणे किंवा कर्जावर दंड व्याज लागणे यासारखे नुकसान टाळता येते.",
      prerequisites: ["देय तारीख आणि कामाचे नाव माहिती असणे."],
      steps: [
        "'अधिक' मध्ये जाऊन 'महत्त्वाच्या तारखा' (Important Dates) निवडा.",
        "'स्मरणपत्र जोडा' दाबा आणि कामाचे नाव लिहा (उदा. 'विहिरीचे लाईट बिल', 'उसाची दुसरी फवारणी', 'ट्रॅक्टर हप्ता').",
        "तारीख निवडा आणि वारंवारिता ठरवा (एकदाच, दरमहा, दरवर्षी).",
        "लागू असल्यास संबंधित पीक, वाहन किंवा कर्ज निवडा.",
        "काम पूर्ण झाल्यावर 'पूर्ण झाले' (Mark as Done) वर टिक करा.",
      ],
      example: {
        scenario: "विहिरीच्या लाईट बिलाची मासिक आठवण",
        details: "नाव: विहीर लाईट बिल, तारीख: दरमहा १० तारीख, प्रकार: दरमहा.",
        result: "तारीख जवळ येताच मुख्य पानावर लाल रंगात आठवण दिसते आणि बिल वेळेवर भरले जाते.",
      },
      expectedResult: "महत्त्वाच्या कामांची वेळेवर आठवण मुख्य स्क्रीनवर स्पष्ट दिसेल.",
      commonMistakes: [
        "दरमहा भरायच्या बिलाला 'एकदाच' (Once) पर्याय निवडणे.",
      ],
      faqs: [
        {
          q: "मोबाईलवर नोटिफिकेशन आवाज येतो का?",
          a: "सेटिंग्जमध्ये सूचना (Notifications) सुरू असल्यास तारीख येताच मोबाईलवर अलर्ट येतो.",
        },
      ],
      keywords: ["स्मरणपत्र", "लाईट बिल", "हप्ता", "फवारणी", "तारखा", "आठवण", "अलर्ट"],
    },
  },

  {
    id: "backup-restore",
    category: "system",
    categoryLabel: { en: "Backup & Recovery", mr: "बॅकअप व सुरक्षितता" },
    icon: "Database",
    relatedIds: ["settings-security", "troubleshooting"],
    en: {
      title: "Data Backup, Restore and Duplicate Prevention",
      shortExplanation: "Download offline JSON backup files and restore records safely without data loss.",
      whyUseful: "Guarantees your financial records remain completely yours, readable offline, and transferable to any new phone.",
      prerequisites: ["Account PIN to authorize export."],
      steps: [
        "Go to More > Backup and Sync (or Settings > Backup & Restore).",
        "Tap 'Download JSON Backup' to save a timestamped backup file to your phone's downloads folder.",
        "Keep a copy in your Google Drive, WhatsApp, or computer for safekeeping.",
        "To restore on a new device: Tap 'Restore from File', select your backup file, preview records, and confirm.",
        "Personal Bank uses idempotent record IDs: existing records are never duplicated or overwritten.",
      ],
      example: {
        scenario: "Switching to a new Android smartphone",
        details: "Farmer exports 'personal-bank-backup-2026.json' from old phone and restores on new phone.",
        result: "All lands, crops, transactions, and balances appear instantly with 0 lost records.",
      },
      expectedResult: "A clean backup file downloaded and ready for duplicate-safe instant restoration.",
      commonMistakes: [
        "Deleting the downloaded JSON file thinking it is a temporary cache file.",
      ],
      faqs: [
        {
          q: "Will restoring a backup overwrite records added since the backup?",
          a: "No. The restore engine merges records using stable unique IDs. Newer records remain untouched.",
        },
      ],
      troubleshooting: [
        {
          problem: "Invalid backup file error.",
          a: "Ensure the file was generated by Personal Bank and has not been edited or corrupted.",
        },
      ],
      keywords: ["backup", "restore", "json", "export", "download", "safety", "new phone"],
    },
    mr: {
      title: "डेटा बॅकअप, सुरक्षितता व रिस्टोअर",
      shortExplanation: "ऑफलाइन JSON बॅकअप डाउनलोड करा आणि नवीन फोनवर सर्व हिशोब सुरक्षित परत आणा.",
      whyUseful: "फोन हरवला, खराब झाला किंवा नवीन फोन घेतला तरी एकही रुपयाचा हिशोब पुसला जाणार नाही याची खात्री मिळते.",
      prerequisites: ["बॅकअप डाउनलोड करण्यासाठी ॲप अनलॉक असणे."],
      steps: [
        "'अधिक' > 'बॅकअप आणि सिंक' (किंवा सेटिंग्ज > बॅकअप) मध्ये जा.",
        "'बॅकअप डाउनलोड करा' (Download Backup) बटनावर दाबा. एक सुरक्षित JSON फाईल फोनमध्ये सेव्ह होईल.",
        "ही फाईल स्वतःच्या व्हॉट्सॲपवर किंवा गुगल ड्राईव्हवर सुरक्षित ठेवा.",
        "नवीन फोनवर डेटा आणण्यासाठी: 'फाइलमधून बॅकअप परत आणा' (Restore) निवडा आणि ती फाईल निवडा.",
        "पर्सनल बँक सर्व नोंदी तपासून जुना व नवा हिशोब अचूकपणे एकत्र करते; कोणत्याही नोंदी दुबार होत नाहीत.",
      ],
      example: {
        scenario: "नवीन मोबाईल घेतल्यावर जुना हिशोब परत आणणे",
        details: "शेतकऱ्याने जुन्या फोनवरून 'personal-bank-backup.json' डाऊनलोड केली आणि नवीन फोनमध्ये रिस्टोअर केली.",
        result: "सर्व शेती, पिके, खर्च आणि शिल्लक एका सेकंदात जशीच्या तशी नवीन फोनवर दिसू लागली.",
      },
      expectedResult: "बॅकअप फाईल डाउनलोड होऊन तुमचा डेटा १००% सुरक्षित राहतो.",
      commonMistakes: [
        "डाउनलोड केलेली फाईल कचरा समजून फोनमधून डिलीट करणे.",
      ],
      faqs: [
        {
          q: "बॅकअप परत आणल्यास नवीन केलेल्या नोंदी उडतील का?",
          a: "नाही! नवीन नोंदी सुरक्षित राहतात आणि बॅकअपमधील नोंदी सुरक्षितपणे एकत्र (Merge) होतात.",
        },
      ],
      keywords: ["बॅकअप", "रिस्टोअर", "सुरक्षितता", "नवीन फोन", "डाउनलोड", "डेटा"],
    },
  },

  {
    id: "settings-security",
    category: "system",
    categoryLabel: { en: "Settings & Security", mr: "सेटिंग्ज व सुरक्षा" },
    icon: "ShieldCheck",
    relatedIds: ["getting-started", "backup-restore", "troubleshooting"],
    en: {
      title: "Settings, Language and Account Security",
      shortExplanation: "Switch languages between English and Marathi, configure PIN, and inspect database status.",
      whyUseful: "Empowers family members to use the app comfortably in Marathi, protects financial privacy, and monitors cloud health.",
      prerequisites: ["Settings page accessible via More > Settings."],
      steps: [
        "Go to More > Settings.",
        "App Preferences: Select your preferred language (English or मराठी). The app updates immediately across every screen.",
        "Security: Change your 4 to 6-digit PIN or generate a new Recovery Code if you ever forget your PIN.",
        "Developer: Tap 'Visit My Portfolio' to view the verified portfolio of the developer at https://sumitjagtap.vercel.app/.",
        "Database Status: Monitor connected MongoDB Atlas cluster name, local records count, and trigger manual sync.",
      ],
      example: {
        scenario: "Switching app language to Marathi for family elder",
        details: "Open Settings > App Language > tap 'मराठी'.",
        result: "All menus, dashboard cards, guides, and forms instantly render in natural Marathi.",
      },
      expectedResult: "Settings saved to local storage and IndexedDB with zero-flash persistence across app launches.",
      commonMistakes: [
        "Sharing your secret PIN with people outside the family.",
      ],
      faqs: [
        {
          q: "Does changing language affect my stored numbers or amounts?",
          a: "Never. Financial amounts are strictly stored as integer paise. Only labels and text are translated.",
        },
      ],
      troubleshooting: [
        {
          problem: "Forgot PIN and cannot unlock the app.",
          a: "Tap 'Forgot PIN?' on the unlock screen, enter your secret recovery code, and set a new PIN.",
        },
      ],
      keywords: ["settings", "language", "marathi", "english", "pin", "security", "portfolio", "cloud status"],
    },
    mr: {
      title: "सेटिंग्ज, भाषा बदल व खाते सुरक्षा",
      shortExplanation: "इंग्रजी व मराठी भाषा बदल, पिन कोड व्यवस्थापन आणि डेटाबेस तपासणी.",
      whyUseful: "घरातील सर्वांना मराठीत हिशोब समजण्यासाठी, हिशोबाची गोपनीयता राखण्यासाठी आणि क्लाउड सिंक तपासण्यासाठी.",
      prerequisites: ["'अधिक' मेनूमध्ये जाऊन 'सेटिंग्ज' उघडा."],
      steps: [
        "'अधिक' > 'सेटिंग्ज' (Settings) मध्ये जा.",
        "ॲप प्राधान्ये: 'ॲपची भाषा' मध्ये 'मराठी' किंवा 'English' निवडा. संपूर्ण ॲप त्वरित त्याच भाषेत सुरू होईल.",
        "सुरक्षा: तुमचा ४ ते ६ अंकी गुप्त पिन बदला किंवा नवीन रिकव्हरी कोड तयार करा.",
        "डेव्हलपर: डेव्हलपरचे प्रोजेक्ट्स व माहिती पाहण्यासाठी 'माझे पोर्टफोलिओ पहा' वर टॅप करा.",
        "क्लाउड बॅकअप: मॉन्गोडीबी डेटाबेसची स्थिती, फोनमधील नोंदी आणि क्लाउड नोंदी तपासा.",
      ],
      example: {
        scenario: "वडिलांसाठी ॲप मराठीत करणे",
        details: "सेटिंग्ज > भाषा > 'मराठी' निवडले.",
        result: "सर्व स्क्रीन, बटणे, शेती आणि पैशांचा हिशोब सोप्या मराठी भाषेत सुरू झाला.",
      },
      expectedResult: "निवडलेली भाषा कायम सेव्ह राहते आणि ॲप पुन्हा उघडल्यावरही मराठीतच राहते.",
      commonMistakes: [
        "आपला गुप्त पिन अनोळखी व्यक्तींना सांगणे.",
      ],
      faqs: [
        {
          q: "भाषा बदलल्याने पैशांचा हिशोब बदलतो का?",
          a: "मुळीच नाही! सर्व रकमा आणि आकडेमोड १००% सुरक्षित व अचूक राहते.",
        },
      ],
      keywords: ["सेटिंग्ज", "भाषा", "मराठी", "इंग्रजी", "पिन", "सुरक्षा", "पोर्टफोलिओ", "क्लाउड"],
    },
  },

  {
    id: "troubleshooting",
    category: "system",
    categoryLabel: { en: "Troubleshooting", mr: "समस्या निवारण" },
    icon: "AlertCircle",
    relatedIds: ["backup-restore", "settings-security"],
    en: {
      title: "Troubleshooting and Resolving Common Issues",
      shortExplanation: "Solutions for cloud sync errors, offline states, forgotten PINs, and pending uploads.",
      whyUseful: "Resolves connectivity glitches quickly without panicking or worrying about losing records.",
      prerequisites: ["Access to Personal Bank Settings or unlock screen."],
      steps: [
        "Issue 1 — Cloud sync shows 'Offline': Ensure your phone is connected to Wi-Fi or mobile data. Offline records remain safe locally.",
        "Issue 2 — Cloud sync shows 'Sync Error': Open Settings > Cloud Backup and review the diagnostic error badge. Tap 'Sync now'.",
        "Issue 3 — Pending uploads exist: Tap 'Sync now' when connected to the internet. Pending changes will push automatically.",
        "Issue 4 — Forgotten PIN: On the lock screen, tap 'Forgot PIN?'. Enter the recovery code you saved during setup to reset your PIN.",
        "Issue 5 — Android PWA install icon missing: In Chrome, tap the 3-dots menu in the top right and select 'Install app' or 'Add to Home screen'.",
      ],
      example: {
        scenario: "Resolving sync in remote farmland without mobile network",
        details: "Farmer enters 5 expenses while in the field. When arriving home on Wi-Fi, app auto-syncs all 5 records to MongoDB.",
        result: "Status updates from 'Local only' to 'Synced' with green indicator.",
      },
      expectedResult: "All syncing errors diagnosed clearly and local records preserved safely at all times.",
      commonMistakes: [
        "Uninstalling the app when offline, which erases un-synced local records.",
      ],
      faqs: [
        {
          q: "Can Personal Bank corrupt my cloud database?",
          a: "No. All sync payloads are authenticated, strictly validated, and isolated to your unique owner ID.",
        },
      ],
      troubleshooting: [
        {
          problem: "The app shows 'Cloud database is unavailable'.",
          a: "Verify that MONGODB_URI environment variable is configured in Vercel with your MongoDB cluster credentials.",
        },
      ],
      keywords: ["troubleshooting", "sync error", "offline", "forgot pin", "pwa", "install", "help"],
    },
    mr: {
      title: "समस्या निवारण व शंका निरसन",
      shortExplanation: "सिंक त्रुटी, इंटरनेट नसणे, पिन विसरणे आणि इतर तांत्रिक अडचणींवरील सोपे उपाय.",
      whyUseful: "कोणतीही अडचण आल्यास न घाबरता किंवा नोंदी पुसल्या जाण्याची भीती न बाळगता त्वरित उपाय मिळतो.",
      prerequisites: ["पर्सनल बँक ॲपमधील सेटिंग्ज किंवा लॉक स्क्रीन."],
      steps: [
        "अडचण १ — 'ऑफलाइन' (Offline) दिसत आहे: फोनचा डेटा किंवा वाय-फाय सुरू असल्याची खात्री करा. ऑफलाइन असतानाही नोंदी फोनमध्ये सुरक्षित राहतात.",
        "अडचण २ — 'सिंक त्रुटी' (Sync error): सेटिंग्ज > क्लाउड बॅकअप मध्ये जाऊन 'आता सिंक करा' (Sync now) वर दाबा.",
        "अडचण ३ — प्रलंबित नोंदी (Pending): इंटरनेट सुरू झाल्यावर 'आता सिंक करा' दाबा, सर्व नोंदी आपोआप क्लाउडवर जातील.",
        "अडचण ४ — पिन विसरला: लॉक स्क्रीनवर 'पिन विसरलात का?' वर दाबा, तुमचा रिकव्हरी कोड टाका आणि नवीन पिन सेट करा.",
        "अडचण ५ — ॲप फोनमध्ये इन्स्टॉल कसे करावे: क्रोम ब्राऊझरमध्ये वरच्या ३ ठिपक्यांवर दाबून 'Install app' किंवा 'Add to Home screen' निवडा.",
      ],
      example: {
        scenario: "रानात रेंज नसताना खर्च नोंदवणे",
        details: "शेतकऱ्याने रानात ५ नोंदी केल्या. घरी येऊन वाय-फाय लागताच सर्व ५ नोंदी आपोआप सिंक झाल्या.",
        result: "हिरवा दिवा लागून 'सिंक झाले' (Synced) असा संदेश आला.",
      },
      expectedResult: "सर्व अडचणींवर तात्काळ मात करता येते आणि हिशोब कायम सुरक्षित राहतो.",
      commonMistakes: [
        "ऑफलाइन असताना ॲप अनइन्स्टॉल करणे (असे केल्यास सिंक न झालेला डेटा जाऊ शकतो).",
      ],
      faqs: [
        {
          q: "माझा डेटा सुरक्षित राहील का?",
          a: "होय! पर्सनल बँक कधीही जुन्या नोंदी डिलीट करत नाही किंवा दुसऱ्या कोणाला दाखवत नाही.",
        },
      ],
      keywords: ["समस्या", "निवारण", "सिंक एरर", "ऑफलाइन", "पिन विसरला", "इन्स्टॉल", "मदत"],
    },
  },
];
