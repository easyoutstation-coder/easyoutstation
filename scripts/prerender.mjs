// Post-build prerender: generates per-route HTML with correct meta tags.
// Run after `vite build`. Creates dist/public/[path]/index.html for every
// SEO-important route so Googlebot gets full title/description/og tags on
// first request — no JS execution needed.

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = join(__dirname, '..', 'dist', 'public')
const BASE = 'https://www.easyoutstation.com'

const template = readFileSync(join(DIST, 'index.html'), 'utf-8')

// Landmark images (mirrors routeImages.ts) — used for og:image
const IMG = {
  manali:       'https://images.unsplash.com/photo-1677821374212-8c3e88292b1b?w=1200&h=630&q=80&fit=crop&auto=format',
  shimla:       'https://images.unsplash.com/photo-1648830802584-ec070946e591?w=1200&h=630&q=80&fit=crop&auto=format',
  chandigarh:   'https://images.unsplash.com/photo-1731593597977-acde4913bd19?w=1200&h=630&q=80&fit=crop&auto=format',
  jaipur:       'https://images.unsplash.com/photo-1578999935853-4ec5fa6c1f60?w=1200&h=630&q=80&fit=crop&auto=format',
  agra:         'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=1200&h=630&q=80&fit=crop&auto=format',
  rishikesh:    'https://images.unsplash.com/photo-1642163168826-37f2233297ac?w=1200&h=630&q=80&fit=crop&auto=format',
  haridwar:     'https://images.unsplash.com/photo-1653392083932-d5e9e7d2ccd1?w=1200&h=630&q=80&fit=crop&auto=format',
  dehradun:     'https://images.unsplash.com/photo-1590351742170-8737ea2e8ce8?w=1200&h=630&q=80&fit=crop&auto=format',
  mussoorie:    'https://images.unsplash.com/photo-1637387568999-92c68bdee212?w=1200&h=630&q=80&fit=crop&auto=format',
  nainital:     'https://images.unsplash.com/photo-1610715936287-6c2ad208cdbf?w=1200&h=630&q=80&fit=crop&auto=format',
  mathura:      'https://images.pexels.com/photos/31626024/pexels-photo-31626024.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
  amritsar:     'https://images.unsplash.com/photo-1623059508779-2542c6e83753?w=1200&h=630&q=80&fit=crop&auto=format',
  dharamshala:  'https://images.unsplash.com/photo-1581321863389-ef7d7bfe4b75?w=1200&h=630&q=80&fit=crop&auto=format',
  kashmir:      'https://images.pexels.com/photos/12750077/pexels-photo-12750077.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
  'vaishno devi': 'https://images.unsplash.com/photo-1717502713522-543a97e13dab?w=1200&h=630&q=80&fit=crop&auto=format',
  ludhiana:     'https://images.pexels.com/photos/33134859/pexels-photo-33134859.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
  ayodhya:      'https://images.unsplash.com/photo-1672398760212-08ce34b88c62?w=1200&h=630&q=80&fit=crop&auto=format',
  banaras:      'https://images.pexels.com/photos/10461752/pexels-photo-10461752.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
  jodhpur:      'https://images.unsplash.com/photo-1566873535350-a3f5d4a804b7?w=1200&h=630&q=80&fit=crop&auto=format',
  udaipur:      'https://images.unsplash.com/photo-1633702738734-443da2c18f3c?w=1200&h=630&q=80&fit=crop&auto=format',
  pushkar:      'https://images.unsplash.com/photo-1715168931029-2949161ee406?w=1200&h=630&q=80&fit=crop&auto=format',
  'mount abu':  'https://images.unsplash.com/photo-1652421027969-6df47aab314a?w=1200&h=630&q=80&fit=crop&auto=format',
  corbett:      'https://images.unsplash.com/photo-1771922365997-8e687eda46b0?w=1200&h=630&q=80&fit=crop&auto=format',
  kasauli:      'https://images.unsplash.com/photo-1720678599878-631001ea7bcc?w=1200&h=630&q=80&fit=crop&auto=format',
  dalhousie:    'https://images.unsplash.com/photo-1589702413183-ca141958b7c5?w=1200&h=630&q=80&fit=crop&auto=format',
  lucknow:      'https://images.unsplash.com/photo-1583504490792-3ceadbc5147c?w=1200&h=630&q=80&fit=crop&auto=format',
  prayagraj:    'https://images.pexels.com/photos/31022593/pexels-photo-31022593.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
  vrindavan:    'https://images.unsplash.com/photo-1662376107358-21296a9234f1?w=1200&h=630&q=80&fit=crop&auto=format',
  spiti:        'https://images.unsplash.com/photo-1653844573020-71f77a0ccb8c?w=1200&h=630&q=80&fit=crop&auto=format',
  lansdowne:    'https://images.pexels.com/photos/10607034/pexels-photo-10607034.jpeg?auto=compress&cs=tinysrgb&w=1200&h=630&fit=crop',
}

// All cab routes (mirrors ROUTES in RouteLanding.tsx)
const CAB_ROUTES = [
  { slug: 'delhi-to-manali',      from: 'Delhi', to: 'Manali',      fareMin: 6730,  img: IMG.manali,      desc: 'Book Delhi to Manali cab at fixed fares. Experienced mountain drivers, comfortable cars, no hidden charges. One way and round trip available.' },
  { slug: 'delhi-to-shimla',      from: 'Delhi', to: 'Shimla',      fareMin: 4450,  img: IMG.shimla,      desc: 'Book Delhi to Shimla cab at fixed fares. Professional drivers, AC cars, door-to-door pickup. One way and round trip available.' },
  { slug: 'delhi-to-chandigarh',  from: 'Delhi', to: 'Chandigarh',  fareMin: 3370,  img: IMG.chandigarh,  desc: 'Book Delhi to Chandigarh cab at fixed fares. Fast, comfortable and reliable. One way and round trip available.' },
  { slug: 'delhi-to-jaipur',      from: 'Delhi', to: 'Jaipur',      fareMin: 3610,  img: IMG.jaipur,      desc: 'Book Delhi to Jaipur cab at fixed fares. Comfortable AC cabs, experienced drivers, on-time pickup guaranteed.' },
  { slug: 'delhi-to-agra',        from: 'Delhi', to: 'Agra',        fareMin: 3010,  img: IMG.agra,        desc: 'Book Delhi to Agra cab at fixed fares. Visit the Taj Mahal comfortably. Same day return trips available.' },
  { slug: 'delhi-to-rishikesh',   from: 'Delhi', to: 'Rishikesh',   fareMin: 3250,  img: IMG.rishikesh,   desc: 'Book Delhi to Rishikesh cab at fixed fares. Adventure awaits! Comfortable journey to the yoga and rafting capital.' },
  { slug: 'delhi-to-dehradun',    from: 'Delhi', to: 'Dehradun',    fareMin: 3850,  img: IMG.dehradun,    desc: 'Book Delhi to Dehradun cab at fixed fares. Gateway to Uttarakhand. Comfortable, reliable and affordable.' },
  { slug: 'delhi-to-mussoorie',   from: 'Delhi', to: 'Mussoorie',   fareMin: 3970,  img: IMG.mussoorie,   desc: 'Book Delhi to Mussoorie cab at fixed fares. The Queen of Hills awaits. Scenic mountain drive with experienced drivers.' },
  { slug: 'delhi-to-nainital',    from: 'Delhi', to: 'Nainital',    fareMin: 3970,  img: IMG.nainital,    desc: 'Book Delhi to Nainital cab at fixed fares. Discover the lake city of Uttarakhand. Safe mountain driving with verified drivers.' },
  { slug: 'delhi-to-mathura',     from: 'Delhi', to: 'Mathura',     fareMin: 2350,  img: IMG.mathura,     desc: 'Book Delhi to Mathura cab at fixed fares. Visit the birthplace of Lord Krishna. Quick and comfortable same-day trip from Delhi.' },
  { slug: 'delhi-to-amritsar',    from: 'Delhi', to: 'Amritsar',    fareMin: 5770,  img: IMG.amritsar,    desc: 'Book Delhi to Amritsar cab at fixed fares. Visit the Golden Temple and Wagah Border with comfort. Verified drivers, AC cars, no hidden charges.' },
  { slug: 'delhi-to-dharamshala', from: 'Delhi', to: 'Dharamshala', fareMin: 5950,  img: IMG.dharamshala, desc: 'Book Delhi to Dharamshala cab at fixed fares. Explore McLeod Ganj, the Dalai Lama\'s abode, Kangra Valley and the Dhauladhar ranges.' },
  { slug: 'delhi-to-kashmir',     from: 'Delhi', to: 'Kashmir',     fareMin: 10090, img: IMG.kashmir,     desc: 'Book Delhi to Kashmir cab at fixed fares. Experience Dal Lake, Mughal Gardens, Gulmarg and the paradise of India.' },
  { slug: 'delhi-to-vaishno-devi',from: 'Delhi', to: 'Vaishno Devi',fareMin: 8050,  img: IMG['vaishno devi'], desc: 'Book Delhi to Vaishno Devi cab at fixed fares. We drop you at Katra, the base camp for the holy shrine. Pilgrimage specialists.' },
  { slug: 'delhi-to-ludhiana',    from: 'Delhi', to: 'Ludhiana',    fareMin: 3970,  img: IMG.ludhiana,    desc: 'Book Delhi to Ludhiana cab at fixed fares. Fast NH44 highway drive to the industrial capital of Punjab. AC cars, verified drivers.' },
  { slug: 'delhi-to-ayodhya',     from: 'Delhi', to: 'Ayodhya',     fareMin: 7930,  img: IMG.ayodhya,     desc: 'Book Delhi to Ayodhya cab at fixed fares. Visit Ram Mandir, Saryu Ghats and the sacred city of Lord Ram. Pilgrimage specialists.' },
  { slug: 'delhi-to-banaras',     from: 'Delhi', to: 'Banaras',     fareMin: 10090, img: IMG.banaras,     desc: 'Book Delhi to Banaras cab at fixed fares. Experience the Ganga Aarti, Kashi Vishwanath Temple and the ancient ghats of Varanasi.' },
  { slug: 'delhi-to-haridwar',    from: 'Delhi', to: 'Haridwar',    fareMin: 2890,  img: IMG.haridwar,    desc: 'Book Delhi to Haridwar cab at fixed fares. Attend the iconic Ganga Aarti at Har Ki Pauri. AC cabs, verified drivers, door-to-door pickup.' },
  { slug: 'delhi-to-jodhpur',     from: 'Delhi', to: 'Jodhpur',     fareMin: 7450,  img: IMG.jodhpur,     desc: 'Book Delhi to Jodhpur cab at fixed fares. Explore the Blue City — Mehrangarh Fort, Jaswant Thada and vibrant bazaars.' },
  { slug: 'delhi-to-udaipur',     from: 'Delhi', to: 'Udaipur',     fareMin: 8230,  img: IMG.udaipur,     desc: 'Book Delhi to Udaipur cab at fixed fares. Explore the City of Lakes — Lake Pichola, City Palace and Fateh Sagar.' },
  { slug: 'delhi-to-pushkar',     from: 'Delhi', to: 'Pushkar',     fareMin: 4990,  img: IMG.pushkar,     desc: 'Book Delhi to Pushkar cab at fixed fares. Visit the only Brahma Temple in the world and the sacred Pushkar Lake.' },
  { slug: 'delhi-to-corbett',     from: 'Delhi', to: 'Corbett',     fareMin: 3250,  img: IMG.corbett,     desc: 'Book Delhi to Jim Corbett cab at fixed fares. India\'s oldest national park — tiger safaris, elephant rides and the Ramganga River.' },
  { slug: 'delhi-to-kasauli',     from: 'Delhi', to: 'Kasauli',     fareMin: 4030,  img: IMG.kasauli,     desc: 'Book Delhi to Kasauli cab at fixed fares. Quiet Himachal hill station known for colonial charm, pine forests and stunning valley views.' },
  { slug: 'delhi-to-dalhousie',   from: 'Delhi', to: 'Dalhousie',   fareMin: 6910,  img: IMG.dalhousie,   desc: 'Book Delhi to Dalhousie cab at fixed fares. Victorian hill station in Himachal Pradesh — pine ridges, colonial churches, Dhauladhar views.' },
  { slug: 'delhi-to-lucknow',     from: 'Delhi', to: 'Lucknow',     fareMin: 6910,  img: IMG.lucknow,     desc: 'Book Delhi to Lucknow cab at fixed fares. Explore the City of Nawabs — Bara Imambara, Rumi Darwaza and iconic Tunday Kababi.' },
  { slug: 'delhi-to-prayagraj',   from: 'Delhi', to: 'Prayagraj',   fareMin: 7990,  img: IMG.prayagraj,   desc: 'Book Delhi to Prayagraj cab at fixed fares. Visit the Sangam — confluence of Ganga, Yamuna and Saraswati. Kumbh Mela destination.' },
  { slug: 'delhi-to-vrindavan',   from: 'Delhi', to: 'Vrindavan',   fareMin: 2110,  img: IMG.vrindavan,   desc: 'Book Delhi to Vrindavan cab at fixed fares. Visit the sacred land of Lord Krishna — Prem Mandir, ISKCON, Banke Bihari Mandir.' },
  { slug: 'delhi-to-spiti',       from: 'Delhi', to: 'Spiti',       fareMin: 9670,  img: IMG.spiti,       desc: 'Book Delhi to Spiti Valley cab at fixed fares. The Cold Desert of Himachal Pradesh — Key Monastery, Pin Valley, Chandratal Lake.' },
  { slug: 'delhi-to-mount-abu',   from: 'Delhi', to: 'Mount Abu',   fareMin: 9610,  img: IMG['mount abu'], desc: 'Book Delhi to Mount Abu cab at fixed fares. Rajasthan\'s only hill station — Dilwara Jain Temples, Nakki Lake and Guru Shikhar Peak.' },
  { slug: 'delhi-to-lansdowne',   from: 'Delhi', to: 'Lansdowne',   fareMin: 3430,  img: IMG.lansdowne,   desc: 'Book Delhi to Lansdowne cab at fixed fares. Uttarakhand\'s most peaceful hill station — dense oak forests and panoramic Himalayan views.' },
]

// All blog posts (mirrors blogPosts.ts — slug, title, metaDescription, heroKey)
const BLOG_POSTS = [
  { slug: 'delhi-to-manali-road-trip-guide',         title: 'Delhi to Manali Road Trip: Complete 2026 Guide + 4-Day Itinerary',                    meta: 'Plan your Delhi to Manali road trip with our complete 2026 guide. 4-day itinerary, best time to visit, cab fares, road tips and places to see.',                                                                heroKey: 'manali' },
  { slug: 'delhi-to-shimla-road-trip-guide',         title: 'Delhi to Shimla by Cab: 3-Day Itinerary & Complete Travel Guide',                      meta: 'Delhi to Shimla road trip guide with 3-day itinerary, best time to visit, cab fare, places to see, and road tips. Book your cab from ₹4,450.',                                                                    heroKey: 'shimla' },
  { slug: 'delhi-to-dharamshala-mcleod-ganj-guide',  title: 'Delhi to Dharamshala & McLeod Ganj: 3-Day Trip Guide & Itinerary',                    meta: 'Complete guide for Delhi to Dharamshala and McLeod Ganj road trip. 3-day itinerary, Dalai Lama temple, trekking, cafe culture, best time, and cab fares.',                                                          heroKey: 'dharamshala' },
  { slug: 'delhi-to-kashmir-road-trip-guide',        title: 'Delhi to Kashmir Road Trip: 7-Day Srinagar Itinerary & Complete Guide',                meta: 'Plan your Delhi to Kashmir road trip with our 7-day Srinagar itinerary. Dal Lake, Pahalgam, Gulmarg, best time to visit, cab fares and road tips.',                                                                  heroKey: 'kashmir' },
  { slug: 'delhi-to-vaishno-devi-guide',             title: 'Delhi to Vaishno Devi: Complete Darshan Guide, Itinerary & Cab Fares',                 meta: 'Complete guide to Delhi to Vaishno Devi pilgrimage by cab. Darshan registration, trekking routes, 2-day itinerary, cab fares and tips for first-time visitors.',                                                     heroKey: 'vaishno devi' },
  { slug: 'delhi-to-chandigarh-travel-guide',        title: 'Delhi to Chandigarh: Day Trip & Weekend Guide with Cab Fare',                           meta: 'Delhi to Chandigarh travel guide — Rock Garden, Sukhna Lake, Rose Garden, Pinjore Gardens. 4–5 hours from Delhi. Cab fare from ₹3,370.',                                                                            heroKey: 'chandigarh' },
  { slug: 'delhi-to-amritsar-golden-temple-guide',   title: 'Delhi to Amritsar: Golden Temple Pilgrimage & Travel Guide',                            meta: 'Delhi to Amritsar road trip guide — Golden Temple darshan, Jallianwala Bagh, Wagah Border ceremony, langar experience. Cab fare from ₹5,650.',                                                                       heroKey: 'amritsar' },
  { slug: 'delhi-to-ludhiana-travel-guide',          title: 'Delhi to Ludhiana: Travel Guide, Places to Visit & Cab Fare',                           meta: 'Delhi to Ludhiana travel guide — Punjab War Memorial, Raza Library, Lodhi Fort, Punjab Agricultural University. Cab fare from ₹3,970. 6 hours from Delhi.',                                                          heroKey: 'ludhiana' },
  { slug: 'delhi-to-jaipur-road-trip-guide',         title: 'Delhi to Jaipur Road Trip: 2-Day Pink City Itinerary & Travel Guide',                  meta: 'Delhi to Jaipur road trip guide with 2-day itinerary. Amber Fort, Hawa Mahal, City Palace, Jantar Mantar. Cab fare from ₹3,610. Best time and road tips.',                                                             heroKey: 'jaipur' },
  { slug: 'delhi-to-agra-taj-mahal-guide',           title: 'Delhi to Agra: Taj Mahal Day Trip or Overnight Guide & Cab Fare',                       meta: 'Delhi to Agra cab guide — Taj Mahal, Agra Fort, Fatehpur Sikri. Day trip possible in 3–4 hours. Cab fare from ₹3,010. Sunrise visit tips and itinerary.',                                                              heroKey: 'agra' },
  { slug: 'delhi-to-mathura-vrindavan-guide',        title: 'Delhi to Mathura & Vrindavan: Spiritual Day Trip Guide & Itinerary',                    meta: 'Delhi to Mathura and Vrindavan day trip guide — Krishna Janmabhoomi, Banke Bihari Temple, ISKCON, Prem Mandir. 180 km from Delhi. Cab fare from ₹2,410.',                                                              heroKey: 'mathura' },
  { slug: 'delhi-to-rishikesh-travel-guide',         title: 'Delhi to Rishikesh: Adventure & Yoga 3-Day Guide with Itinerary',                       meta: 'Delhi to Rishikesh travel guide — white water rafting, bungee jumping, Ganga aarti, yoga ashrams. 240 km, 5 hours. Cab fare from ₹3,130. Best time & tips.',                                                           heroKey: 'rishikesh' },
  { slug: 'delhi-to-haridwar-ganga-aarti-guide',     title: 'Delhi to Haridwar: Ganga Aarti, Pilgrimage Guide & Cab Fare',                           meta: 'Delhi to Haridwar guide — Har Ki Pauri Ganga aarti, Mansa Devi Temple, Chandi Devi, Kumbh Mela. 220 km from Delhi. Cab fare from ₹2,890. Day trip possible.',                                                          heroKey: 'haridwar' },
  { slug: 'delhi-to-dehradun-travel-guide',          title: 'Delhi to Dehradun: Weekend Gateway to Uttarakhand — Guide & Itinerary',                 meta: 'Delhi to Dehradun travel guide — Robber\'s Cave, Sahastradhara, Forest Research Institute, Tapkeshwar Temple. 250 km, 5 hours. Cab fare from ₹3,250.',                                                                 heroKey: 'dehradun' },
  { slug: 'delhi-to-mussoorie-travel-guide',         title: 'Delhi to Mussoorie: Queen of Hills Weekend Guide & Itinerary',                          meta: 'Delhi to Mussoorie road trip guide — Mall Road, Kempty Falls, Gun Hill, Lal Tibba, Company Garden. 295 km, 6 hours. Cab fare from ₹3,790. Best time to visit.',                                                         heroKey: 'mussoorie' },
  { slug: 'delhi-to-nainital-travel-guide',          title: 'Delhi to Nainital: Lakes & Hills 3-Day Itinerary & Complete Guide',                     meta: 'Delhi to Nainital travel guide — Naini Lake, Naina Devi Temple, Snow View, Jim Corbett, Mall Road. 300 km, 6 hours. Cab fare from ₹3,850. Best time to visit.',                                                          heroKey: 'nainital' },
  { slug: 'delhi-to-ayodhya-ram-mandir-guide',       title: 'Delhi to Ayodhya: Ram Mandir Darshan Complete Guide & 2-Day Itinerary',                 meta: 'Complete guide for Delhi to Ayodhya pilgrimage. Ram Mandir darshan, Saryu Ghats, Hanuman Garhi, Kanak Bhawan. Cab fare from ₹7,930. Itinerary and tips.',                                                               heroKey: 'ayodhya' },
  { slug: 'delhi-to-varanasi-ganga-aarti-guide',     title: 'Delhi to Varanasi (Banaras): Ganga Aarti & Ghats 3-Day Guide',                         meta: 'Delhi to Varanasi road trip guide — Dashashwamedh Ghat aarti, Kashi Vishwanath Temple, Sarnath, sunrise boat ride. 820 km. Cab fare from ₹10,090. Full itinerary.',                                                      heroKey: 'banaras' },
  { slug: 'delhi-to-udaipur-road-trip-guide',        title: 'Delhi to Udaipur Road Trip: Complete 2026 Guide & 3-Day Itinerary',                     meta: 'Plan your Delhi to Udaipur cab trip with our complete 2026 guide. 3-day itinerary, best time to visit, Lake Pichola boat ride, City Palace, cab fares from ₹8,230.',                                                     heroKey: 'udaipur' },
  { slug: 'delhi-to-jodhpur-road-trip-guide',        title: 'Delhi to Jodhpur Road Trip: Complete Guide, Blue City Itinerary & Cab Fare 2026',       meta: 'Delhi to Jodhpur cab guide 2026. 2-day Blue City itinerary, Mehrangarh Fort, Jaswant Thada, best food, cab fares from ₹7,450. Drive route & road tips included.',                                                         heroKey: 'jodhpur' },
  { slug: 'delhi-to-jim-corbett-safari-guide',       title: 'Delhi to Jim Corbett: Safari Guide, 2-Day Itinerary & Cab Fare 2026',                   meta: 'Delhi to Jim Corbett cab guide 2026. Tiger safari zones, Dhikala booking tips, 2-day itinerary, accommodation, and cab fares from ₹3,250. Complete travel guide.',                                                       heroKey: 'corbett' },
  { slug: 'delhi-to-lucknow-travel-guide',           title: 'Delhi to Lucknow: City of Nawabs Travel Guide, Itinerary & Cab Fare 2026',              meta: 'Delhi to Lucknow cab guide 2026. Bara Imambara, Rumi Darwaza, Tunday Kababi, 2-day itinerary, cab fares from ₹6,910. Complete Lucknow travel guide.',                                                                      heroKey: 'lucknow' },
  { slug: 'delhi-to-prayagraj-sangam-guide',         title: 'Delhi to Prayagraj: Sangam Travel Guide, Itinerary & Cab Fare 2026',                    meta: 'Delhi to Prayagraj cab guide 2026. Sangam boat ride, Triveni Ghat aarti, Anand Bhavan, Kumbh Mela dates, 2-day itinerary and cab fares from ₹7,990.',                                                                    heroKey: 'prayagraj' },
  { slug: 'delhi-to-pushkar-travel-guide',           title: 'Delhi to Pushkar: Brahma Temple, Camel Fair & Travel Guide 2026',                       meta: 'Delhi to Pushkar cab guide 2026. Brahma Temple, Pushkar Lake ghats, Camel Fair dates, 2-day itinerary and cab fares from ₹4,990. Complete Pushkar travel guide.',                                                         heroKey: 'pushkar' },
  { slug: 'delhi-to-dalhousie-travel-guide',         title: 'Delhi to Dalhousie & Khajjiar: Hill Station Guide & Cab Fare 2026',                     meta: 'Delhi to Dalhousie cab guide 2026. Khajjiar Mini Switzerland, Dainkund Peak, colonial heritage, 2-day itinerary and cab fares from ₹6,910. Complete HP hill station guide.',                                               heroKey: 'dalhousie' },
  { slug: 'delhi-to-kasauli-travel-guide',           title: 'Delhi to Kasauli: Weekend Hill Station Guide & Cab Fare 2026',                           meta: 'Delhi to Kasauli cab guide 2026. Gilbert Trail, Monkey Point, colonial cantonment, 2-day itinerary and cab fares from ₹4,030. India\'s quietest hill station guide.',                                                      heroKey: 'kasauli' },
  { slug: 'delhi-to-spiti-valley-guide',             title: 'Delhi to Spiti Valley: Complete Road Trip Guide & Itinerary 2026',                      meta: 'Delhi to Spiti Valley road trip guide 2026. Key Monastery, Chandratal Lake, Rohtang route, best time to visit, SUV requirements, and cab fares from ₹9,670.',                                                            heroKey: 'spiti' },
  { slug: 'delhi-to-mount-abu-travel-guide',         title: 'Delhi to Mount Abu: Dilwara Temples, Nakki Lake & Travel Guide 2026',                   meta: 'Delhi to Mount Abu cab guide 2026. Dilwara Jain Temples, Nakki Lake, Guru Shikhar, 2-day itinerary and cab fares from ₹9,610. Rajasthan\'s only hill station guide.',                                                   heroKey: 'mount abu' },
  { slug: 'delhi-to-lansdowne-travel-guide',         title: "Delhi to Lansdowne: Uttarakhand's Quietest Hill Station Guide 2026",                    meta: 'Delhi to Lansdowne cab guide 2026. Tip\'n\'Top viewpoint, Bhim Pakora, Garhwal Rifles War Memorial, 2-day itinerary and cab fares from ₹3,430. Hidden gem travel guide.',                                                heroKey: 'lansdowne' },
  { slug: 'delhi-to-vrindavan-day-trip-guide',       title: 'Delhi to Vrindavan: Prem Mandir, ISKCON & Complete Day Trip Guide 2026',                meta: 'Delhi to Vrindavan cab guide 2026. Prem Mandir light show, Banke Bihari Mandir, ISKCON Vrindavan, complete day trip itinerary and cab fares from ₹2,110.',                                                              heroKey: 'vrindavan' },
]

// ─── HTML injection ───────────────────────────────────────────────────────────

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function inject(html, { title, description, canonical, ogImage }) {
  const safeTitle = esc(title)
  const safeDesc  = esc(description)
  const img = ogImage || `${BASE}/hero-bg.jpg`
  return html
    .replace(/<title>[^<]*<\/title>/,                                          `<title>${safeTitle}</title>`)
    .replace(/(<meta name="description"\s+content=")[^"]*(")/,                `$1${safeDesc}$2`)
    .replace(/(<meta property="og:title"\s+content=")[^"]*(")/,               `$1${safeTitle}$2`)
    .replace(/(<meta property="og:description"\s+content=")[^"]*(")/,        `$1${safeDesc}$2`)
    .replace(/(<meta property="og:url"\s+content=")[^"]*(")/,                 `$1${canonical}$2`)
    .replace(/(<meta property="og:image"\s+content=")[^"]*(")/,               `$1${img}$2`)
    .replace(/(<meta name="twitter:title"\s+content=")[^"]*(")/,              `$1${safeTitle}$2`)
    .replace(/(<meta name="twitter:description"\s+content=")[^"]*(")/,       `$1${safeDesc}$2`)
    .replace(/(<meta name="twitter:image"\s+content=")[^"]*(")/,              `$1${img}$2`)
    .replace(/(<link rel="canonical"\s+href=")[^"]*(")/,                      `$1${canonical}$2`)
}

function save(urlPath, meta) {
  const dir = join(DIST, urlPath)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), inject(template, meta), 'utf-8')
  console.log(`  ✓ /${urlPath}`)
}

// ─── Generate pages ───────────────────────────────────────────────────────────

console.log('\n🚀 Prerendering cab routes...')
for (const r of CAB_ROUTES) {
  const fareFormatted = r.fareMin.toLocaleString('en-IN')
  save(`cab/${r.slug}`, {
    title:       `${r.from} to ${r.to} Cab | ₹${fareFormatted} Fixed Fare | EasyOutstation`,
    description: r.desc,
    canonical:   `${BASE}/cab/${r.slug}`,
    ogImage:     r.img,
  })
}

console.log('\n📖 Prerendering blog posts...')
for (const b of BLOG_POSTS) {
  save(`blog/${b.slug}`, {
    title:       b.title,
    description: b.meta,
    canonical:   `${BASE}/blog/${b.slug}`,
    ogImage:     IMG[b.heroKey],
  })
}

console.log('\n🗂️  Prerendering static pages...')
save('routes', {
  title:       'All Outstation Cab Routes from Delhi | EasyOutstation',
  description: 'Browse all outstation cab routes from Delhi. Fixed fares, verified drivers, no hidden charges. Manali, Shimla, Jaipur, Agra, Rishikesh and 25+ more destinations.',
  canonical:   `${BASE}/routes`,
})
save('blog', {
  title:       'Travel Guides & Road Trip Blogs | EasyOutstation',
  description: 'Delhi road trip guides, destination itineraries, travel tips and cab fare guides for 30+ destinations. Plan your next outstation trip from Delhi.',
  canonical:   `${BASE}/blog`,
})
save('about', {
  title:       "About EasyOutstation | Delhi's Trusted Outstation Cab Service",
  description: "EasyOutstation is Delhi's most trusted outstation cab service. Verified drivers, fixed fares, driver charges included, zero hidden charges. Available 24/7.",
  canonical:   `${BASE}/about`,
})
save('faq', {
  title:       'FAQs — Cab Booking, Fares & Drivers | EasyOutstation',
  description: 'Answers to common questions about EasyOutstation cab booking — fares, driver charges, tolls, advance payment, cancellation and more.',
  canonical:   `${BASE}/faq`,
})

const total = CAB_ROUTES.length + BLOG_POSTS.length + 4
console.log(`\n✅ Done — ${total} pages prerendered.\n`)
