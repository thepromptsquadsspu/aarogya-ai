"""
Clinical decision trees for symptom-specific dynamic follow-up question branching.
Supports: cardiac_chest, neurological_headache, respiratory_breathing,
abdominal_pain, trauma_laceration, fever_infection, and general_triage.
Languages: English (en), Hindi (hi), Marathi (mr).
"""

from typing import Dict, List, Any, Optional

CLINICAL_TREES: Dict[str, List[Dict[str, Any]]] = {
    "cardiac_chest": [
        {
            "facet": "character_and_onset",
            "keywords": ["onset", "start", "type", "sharp", "pressure", "crushing", "squeezing", "दबाव", "जडपणा", "तीव्र"],
            "questions": {
                "en": "How would you describe the chest discomfort? Is it a heavy squeezing, sharp stabbing, or burning sensation, and did it start suddenly?",
                "hi": "छाती में दर्द कैसा महसूस हो रहा है? क्या यह भारीपन, तेज चुभन या जलन जैसा है, और क्या यह अचानक शुरू हुआ?",
                "mr": "छातीत होणारा त्रास कसा आहे? छातीवर दाब किंवा जडपणा आहे, टोचल्यासारखे वाटते की जळजळ होते, आणि हे अचानक सुरू झाले का?"
            },
            "quick_replies": {
                "en": ["Heavy pressure / squeezing", "Sharp stabbing pain", "Burning sensation", "Sudden onset"],
                "hi": ["छाती पर भारी दबाव", "तेज चुभने वाला दर्द", "जलन जैसा दर्द", "अचानक शुरू हुआ"],
                "mr": ["छातीवर जड दाब", "तीव्र टोचल्यासारखे", "जळजळ होते", "अचानक सुरू झाले"]
            }
        },
        {
            "facet": "radiation",
            "keywords": ["radiat", "spread", "arm", "jaw", "neck", "back", "कंधा", "जबड़ा", "हात", "मान"],
            "questions": {
                "en": "Does the pain radiate or travel anywhere else, such as your left arm, jaw, neck, or back?",
                "hi": "क्या यह दर्द कहीं और फैल रहा है, जैसे आपके बाएं हाथ, जबड़े, गर्दन या पीठ में?",
                "mr": "हा त्रास किंवा वेदना डाव्या हाताकडे, जबड्याकडे, मानेकडे किंवा पाठीकडे पसरते आहे का?"
            },
            "quick_replies": {
                "en": ["Spreading to left arm", "Spreading to jaw/neck", "Going to upper back", "Stays strictly in chest"],
                "hi": ["बाएं हाथ में फैल रहा है", "जबड़े / गर्दन में", "पीठ में जा रहा है", "सिर्फ छाती में सीमित है"],
                "mr": ["डाव्या हाताकडे पसरते", "जबड्याकडे / मानेकडे", "पाठीकडे जाते", "फक्त छातीतच आहे"]
            }
        },
        {
            "facet": "associated_cardiac_signs",
            "keywords": ["sweat", "breathless", "nausea", "dizzy", "faint", "पसीना", "घाम", "चक्कर", "दम"],
            "questions": {
                "en": "Are you experiencing cold sweating, noticeable shortness of breath, dizziness, or nausea?",
                "hi": "क्या आपको ठंडा पसीना आ रहा है, सांस लेने में तकलीफ हो रही है, या चक्कर / उल्टी जैसा लग रहा है?",
                "mr": "तुम्हाला थंड घाम येत आहे का, श्वास भरून येत आहे किंवा चक्कर / मळमळ जाणवत आहे का?"
            },
            "quick_replies": {
                "en": ["Cold sweating & breathless", "Shortness of breath only", "Dizzy / lightheaded", "None of these"],
                "hi": ["ठंडा पसीना और सांस फूलना", "सिर्फ सांस में तकलीफ", "चक्कर आ रहे हैं", "इनमें से कोई नहीं"],
                "mr": ["थंड घाम आणि दम लागतो", "फक्त श्वास घ्यायला त्रास", "चक्कर येत आहे", "यापैकी काहीही नाही"]
            }
        },
        {
            "facet": "history_and_exertion",
            "keywords": ["walk", "climb", "stairs", "rest", "worse", "history", "heart", "बीपी", "हृदय"],
            "questions": {
                "en": "Does the chest pain worsen when you walk or climb stairs, and does it ease when resting?",
                "hi": "क्या चलने या सीढ़ियां चढ़ने पर दर्द बढ़ जाता है, और आराम करने पर कुछ राहत मिलती है?",
                "mr": "चालताना किंवा पायऱ्या चढताना छातीत दुखणे वाढते का, आणि विश्रांती घेतल्यावर कमी होते का?"
            },
            "quick_replies": {
                "en": ["Worse with walking/stairs", "Constant even when resting", "Relieved by resting", "Known heart patient"],
                "hi": ["चलने पर बढ़ता है", "आराम करने पर भी जारी है", "आराम करने पर घटता है", "पहले से हृदय रोग है"],
                "mr": ["चालल्यावर जास्त दुखते", "विश्रांतीतही सतत दुखते", "विश्रांतीने बरे वाटते", "हृदयरोग इतिहास आहे"]
            }
        }
    ],

    "neurological_headache": [
        {
            "facet": "thunderclap_onset",
            "keywords": ["onset", "sudden", "thunderclap", "worst", "severe", "अचानक", "तीव्र डोकेदुखी"],
            "questions": {
                "en": "Did this headache come on suddenly like a thunderclap (reaching maximum severity within seconds), and is it the worst headache of your life?",
                "hi": "क्या यह सिरदर्द बिजली की तरह अचानक और तीव्र शुरू हुआ, और क्या यह आपकी जिंदगी का सबसे गंभीर सिरदर्द है?",
                "mr": "ही डोकेदुखी विजेच्या झटक्यासारखी क्षणात अतिशय तीव्र झाली का, आणि ही तुमच्या आयुष्यातील सर्वात असह्य डोकेदुखी आहे का?"
            },
            "quick_replies": {
                "en": ["Worst headache of life (Thunderclap)", "Gradually increased over hours", "Throbbing on one side", "Mild to moderate ache"],
                "hi": ["जिंदगी का सबसे भीषण सिरदर्द", "धीरे-धीरे कई घंटों में बढ़ा", "एक तरफ धड़कने वाला दर्द", "हल्का से मध्यम दर्द"],
                "mr": ["आयुष्यातील सर्वात असह्य डोकेदुखी", "हळूहळू वाढत गेली", "एका बाजूला ठणकणारी", "हलकी ते मध्यम"]
            }
        },
        {
            "facet": "fast_stroke_deficits",
            "keywords": ["face", "arm", "droop", "speech", "slur", "weakness", "लकवा", "चेहरा", "हात कमकुवत"],
            "questions": {
                "en": "Have you noticed any facial drooping, sudden weakness in one arm or leg, or slurred/difficulty speaking?",
                "hi": "क्या चेहरे का एक हिस्सा टेढ़ा हुआ है, एक हाथ या पैर में अचानक कमजोरी आई है, या बोलने में लड़खड़ाहट है?",
                "mr": "चेहरा एका बाजूला वाकडा झाला आहे का, एका हाता-पायातील ताकद गेली आहे किंवा बोलताना अडखळत आहे का?"
            },
            "quick_replies": {
                "en": ["Arm or leg weakness", "Slurred speech", "Facial asymmetry", "None of these deficits"],
                "hi": ["हाथ या पैर में कमजोरी", "बोलने में लड़खड़ाहट", "चेहरा टेढ़ा होना", "इनमें से कोई नहीं"],
                "mr": ["हात किंवा पायात अशक्तपणा", "बोलण्यात अडखळणे", "चेहरा वाकडा होणे", "यापैकी काहीही नाही"]
            }
        },
        {
            "facet": "meningeal_vision_signs",
            "keywords": ["neck", "stiff", "light", "vision", "blur", "double", "गर्दन", "मान ताठ", "उजेड"],
            "questions": {
                "en": "Do you have neck stiffness (difficulty touching your chin to your chest), extreme sensitivity to light, or blurred/double vision?",
                "hi": "क्या गर्दन में अकड़न है (ठोड़ी को छाती से छूने में परेशानी), तेज रोशनी से दिक्कत या धुंधला दिखाई दे रहा है?",
                "mr": "मानेमध्ये कडकपणा (हनुवटी छातीला टेकवता येत नाही), प्रकाशाचा त्रास किंवा अंधुक/दुहेरी दिसते आहे का?"
            },
            "quick_replies": {
                "en": ["Stiff neck & fever", "Extreme light sensitivity", "Blurred / double vision", "No neck stiffness"],
                "hi": ["गर्दन में अकड़न और बुखार", "रोशनी बर्दाश्त नहीं हो रही", "धुंधला या दोहरा दिखना", "गर्दन में अकड़न नहीं"],
                "mr": ["मान ताठ आणि ताप", "प्रकाशाचा तीव्र त्रास", "अंधुक / दुहेरी दृष्टी", "मानेला कडकपणा नाही"]
            }
        }
    ],

    "respiratory_breathing": [
        {
            "facet": "breathing_effort",
            "keywords": ["effort", "sentence", "speaking", "breathless", "gasp", "सांस", "दम लागणे"],
            "questions": {
                "en": "Are you able to speak full sentences without pausing to catch your breath, or is it difficult to speak even a few words?",
                "hi": "क्या आप बिना रुके पूरा वाक्य बोल पा रहे हैं, या सांस फूलने के कारण कुछ शब्द बोलना भी मुश्किल हो रहा है?",
                "mr": "तुम्ही न थांबता पूर्ण वाक्य बोलू शकता का, की श्वास लागल्यामुळे दोन शब्द सलग बोलणेही कठीण जात आहे?"
            },
            "quick_replies": {
                "en": ["Can only speak 1-2 words", "Can speak short sentences", "Breathing normally while resting", "Wheezing / whistling sound"],
                "hi": ["सिर्फ 1-2 शब्द बोल पा रहा हूँ", "छोटे वाक्य बोल पा रहा हूँ", "आराम में सांस ठीक है", "सीटी जैसी आवाज आ रही है"],
                "mr": ["फक्त 1-2 शब्द बोलता येतात", "छोटी वाक्ये बोलता येतात", "विश्रांतीत श्वास ठीक आहे", "घरघर / शिट्टीसारखा आवाज"]
            }
        },
        {
            "facet": "oxygen_and_color",
            "keywords": ["spo2", "pulse", "blue", "lips", "finger", "ऑक्सीजन", "निळा", "नख"],
            "questions": {
                "en": "Do you have a pulse oximeter showing your SpO2 reading, or have you noticed bluish discoloration around your lips or fingernails?",
                "hi": "क्या आपके पास पल्स ऑक्सीमीटर है जिससे SpO2 देखा हो, या होठों / नाखूनों के आसपास नीलापन नजर आ रहा है?",
                "mr": "तुमच्याकडे पल्स ऑक्सिमीटरने SpO2 तपासले आहे का, किंवा ओठ अथवा नखांच्या भोवती निळसरपणा दिसत आहे का?"
            },
            "quick_replies": {
                "en": ["SpO2 below 90%", "SpO2 between 90-94%", "SpO2 above 95%", "No pulse oximeter available"],
                "hi": ["SpO2 90% से कम", "SpO2 90-94% के बीच", "SpO2 95% से अधिक", "ऑक्सीमीटर उपलब्ध नहीं"],
                "mr": ["SpO2 90% पेक्षा कमी", "SpO2 90-94% दरम्यान", "SpO2 95% पेक्षा जास्त", "ऑक्सिमीटर उपलब्ध नाही"]
            }
        },
        {
            "facet": "cough_sputum_hemoptysis",
            "keywords": ["cough", "blood", "phlegm", "sputum", "खोकला", "रक्त", "कफ", "थुंकी"],
            "questions": {
                "en": "Is there a cough producing phlegm, and have you coughed up any traces of blood?",
                "hi": "क्या खांसी के साथ बलगम आ रहा है, और क्या थूक या बलगम में खून दिखाई दिया है?",
                "mr": "खोकल्यासोबत कफ पडत आहे का, आणि थुंकीतून रक्त पडले आहे का?"
            },
            "quick_replies": {
                "en": ["Coughing blood (red phlegm)", "Yellow/green thick phlegm", "Dry hacking cough", "No cough at all"],
                "hi": ["खून आ रहा है", "पीला/हरा गाढ़ा बलगम", "सूखी खांसी", "खांसी नहीं है"],
                "mr": ["थुंकीतून रक्त पडते", "पिवळा/हिरवा कफ", "कोरडा खोकला", "खोकला नाही"]
            }
        }
    ],

    "abdominal_pain": [
        {
            "facet": "location_and_migration",
            "keywords": ["location", "belly", "right", "lower", "navel", "पेटी", "पोट", "उजवीकडे"],
            "questions": {
                "en": "Where exactly is the belly pain, and did it start around your navel before shifting to the lower right side?",
                "hi": "पेट में दर्द ठीक किस जगह पर है, और क्या यह नाभि के पास से शुरू होकर नीचे दाईं तरफ गया है?",
                "mr": "पोटात नेमके कुठे दुखत आहे, आणि हे बेंबीजवळ सुरू होऊन खालच्या उजव्या बाजूला सरकले आहे का?"
            },
            "quick_replies": {
                "en": ["Shifted to lower right side", "Upper stomach / epigastric", "Lower abdomen / pelvis", "All over the entire abdomen"],
                "hi": ["नाभि से नीचे दाईं ओर गया", "पेट के ऊपरी हिस्से में", "पेड़ू / निचले हिस्से में", "पूरे पेट में फैला हुआ"],
                "mr": ["खालच्या उजव्या बाजूला गेले", "पोटाच्या वरच्या भागात", "ओटीपोटात / खाली", "संपूर्ण पोटात पसरले"]
            }
        },
        {
            "facet": "peritoneal_signs",
            "keywords": ["touch", "rebound", "rigid", "board", "cough", "अकड़न", "दाबल्यावर"],
            "questions": {
                "en": "Is your belly very rigid or hard like a board, and does the pain spike sharply if you cough or gently press and release?",
                "hi": "क्या पेट तख्त की तरह सख्त हो गया है, और क्या खांसने या छूकर दबाने-छोड़ने पर असह्य दर्द होता है?",
                "mr": "पोट फळीसारखे घट्ट/कडक झाले आहे का, आणि खोकताना किंवा हलका दाब देऊन सोडल्यावर तीव्र वेदना होते का?"
            },
            "quick_replies": {
                "en": ["Very hard / rigid belly", "Sharp pain on release/cough", "Tender but soft", "No rigidity or tenderness"],
                "hi": ["पेट बहुत सख्त और कड़ा है", "छोड़ने या खांसने पर तेज दर्द", "नरम है लेकिन छूने पर दर्द", "पेट कड़ा नहीं है"],
                "mr": ["पोट खूप घट्ट आणि कडक आहे", "दाब सोडताना / खोकताना तीव्र", "मऊ आहे पण दुखते", "कडकपणा नाही"]
            }
        },
        {
            "facet": "gastrointestinal_loss",
            "keywords": ["vomit", "stool", "diarrhea", "black", "blood", "उल्टी", "दस्त", "शौच"],
            "questions": {
                "en": "Have you had persistent vomiting, fever, or noticed black tarry stools or blood in your vomit/stool?",
                "hi": "क्या लगातार उल्टी हो रही है, बुखार है, या उल्टी या मल में खून अथवा काला रंग दिखाई दिया है?",
                "mr": "सतत उलट्या होत आहेत का, ताप आला आहे किंवा विष्ठेतून रक्त / काळ्या रंगाची शौचास झाली आहे का?"
            },
            "quick_replies": {
                "en": ["Vomiting & cannot keep water down", "Black tarry stool or blood", "Watery diarrhea only", "Mild nausea, no vomiting"],
                "hi": ["उल्टी में पानी भी नहीं रुक रहा", "काला मल या खून", "केवल दस्त हो रहे हैं", "हल्की मिचली, उल्टी नहीं"],
                "mr": ["पाणीही उलटून पडत आहे", "काळी शौच किंवा रक्त", "फक्त पातळ जुलाब", "हलकी मळमळ, उलटी नाही"]
            }
        }
    ],

    "trauma_laceration": [
        {
            "facet": "bleeding_and_control",
            "keywords": ["bleed", "pressure", "stop", "spurting", "खून", "रक्त", "थांबत नाही"],
            "questions": {
                "en": "Is the wound actively bleeding right now, and has firm continuous direct pressure stopped the bleeding?",
                "hi": "क्या चोट से अभी भी खून बह रहा है, और क्या 5 मिनट लगातार सीधा दबाव देने से खून रुका है?",
                "mr": "जखमेतून सध्या रक्त वाहत आहे का, आणि सलग ५ मिनिटे दाबून धरल्याने रक्त थांबले आहे का?"
            },
            "quick_replies": {
                "en": ["Bleeding stopped with pressure", "Blood spurting / won't stop", "Deep gaping cut", "Superficial scratch"],
                "hi": ["दबाव से खून रुक गया है", "खून फव्वारे की तरह बह रहा है", "गहरा खुला घाव है", "हल्की खरोंच है"],
                "mr": ["दाबल्याने रक्त थांबले", "रक्त सतत वाहत आहे", "खोल उघडी जखम आहे", "फक्त खरचटले आहे"]
            }
        },
        {
            "facet": "mechanism_and_head_injury",
            "keywords": ["fall", "accident", "head", "blackout", "unconscious", "बेहोश", "पडणे", "बेशुद्ध"],
            "questions": {
                "en": "How did the injury happen? If you struck your head, did you lose consciousness, vomit, or feel confused?",
                "hi": "चोट कैसे लगी? अगर सिर पर चोट लगी है, तो क्या आप बेहोश हुए थे, उल्टी हुई, या चक्कर आ रहे हैं?",
                "mr": "जखम कशी झाली? डोक्याला मार लागला असेल तर बेशुद्ध पडला होता का, उलटी झाली किंवा गोंधळल्यासारखे झाले का?"
            },
            "quick_replies": {
                "en": ["Fell / struck head & blacked out", "Kitchen knife / tool cut", "Road traffic accident", "Twisted joint while playing"],
                "hi": ["सिर पर चोट और बेहोशी", "चाकू या घरेलू औजार से कटा", "सड़क दुर्घटना", "खेलते समय जोड़ मुड़ा"],
                "mr": ["डोक्याला मार आणि बेशुद्धी", "विळी/सुरी लागून कापले", "रस्ता अपघात", "खेळताना लचक भरली"]
            }
        },
        {
            "facet": "weight_bearing_deformity",
            "keywords": ["weight", "walk", "deform", "bone", "swelling", "हड्डी", "सूजन", "हाड", "चालता"],
            "questions": {
                "en": "Is there any visible bone deformity or severe swelling, and are you able to take 4 steps bearing full weight on the injured limb?",
                "hi": "क्या कोई हड्डी टेढ़ी दिखाई दे रही है या बहुत सूजन है, और क्या आप उस पैर पर 4 कदम वजन डालकर चल पा रहे हैं?",
                "mr": "हाड वाकडे झालेले दिसते आहे का किंवा खूप सूज आहे, आणि दुखापत झालेल्या पायावर ४ पावले वजन टाकून चालता येते का?"
            },
            "quick_replies": {
                "en": ["Cannot bear any weight", "Can limp a few steps", "Visible deformity / crooked", "Swollen but can bear weight"],
                "hi": ["बिल्कुल वजन नहीं रख पा रहा", "लंगड़ा कर कुछ कदम चल सकता हूँ", "हड्डी टेढ़ी नजर आ रही है", "सूजन है पर चल पा रहा हूँ"],
                "mr": ["पायावर अजिबात वजन टाकता येत नाही", "लंगडत काही पावले चालता येते", "हाड वाकडे झालेले दिसते", "सूज आहे पण चालता येते"]
            }
        }
    ],

    "fever_infection": [
        {
            "facet": "duration_and_temperature",
            "keywords": ["temperature", "degree", "days", "high", "chill", "बुखार", "ताप", "दिवस"],
            "questions": {
                "en": "How many days have you had this fever, and what is the highest temperature recorded on a thermometer?",
                "hi": "बुखार कितने दिनों से है, और थर्मामीटर पर अधिकतम कितना तापमान दर्ज हुआ है?",
                "mr": "ताप किती दिवसांपासून येत आहे, आणि थर्मामीटरवर मोजलेले सर्वोच्च तापमान किती भरले?"
            },
            "quick_replies": {
                "en": ["High fever (> 103°F / 39.4°C)", "Moderate fever (100-102°F)", "Started today with chills", "Lasting more than 3 days"],
                "hi": ["तेज बुखार (103°F से अधिक)", "मध्यम बुखार (100-102°F)", "आज ही कंपकंपी से शुरू", "3 दिन से ज्यादा से जारी"],
                "mr": ["तीव्र ताप (१०३°F पेक्षा जास्त)", "मध्यम ताप (१००-१०२°F)", "आजच थंडी वाजून आला", "३ दिवसांपेक्षा जास्त वेळ"]
            }
        },
        {
            "facet": "systemic_warning_signs",
            "keywords": ["rash", "seizure", "lethargy", "urine", "stiff", "दाने", "सुस्त", "लघवी", "चट्टे"],
            "questions": {
                "en": "Are there any warning signs such as a dark purple rash, severe lethargy/confusion, stiff neck, or burning when passing urine?",
                "hi": "क्या शरीर पर कोई गहरे लाल/बैंगनी दाने हैं, बहुत अधिक सुस्ती या भ्रम है, गर्दन में अकड़न है, या पेशाब में जलन हो रही है?",
                "mr": "अंगावर गडद लाल किंवा जांभळे चट्टे आले आहेत का, खूप जास्त सुस्ती/गुंगी आहे, मान ताठ झाली आहे किंवा लघवीला आग होते का?"
            },
            "quick_replies": {
                "en": ["Severe lethargy / very drowsy", "Burning while passing urine", "Purple skin rash / spots", "None of these warning signs"],
                "hi": ["बहुत ज्यादा सुस्ती या कमजोरी", "पेशाब में तेज जलन", "शरीर पर लाल-बैंगनी चट्टे", "इनमें से कोई नहीं"],
                "mr": ["अतिशय सुस्ती व गुंगी", "लघवी करताना तीव्र जळजळ", "अंगावर जांभळे चट्टे", "यापैकी कोणतीही लक्षणे नाहीत"]
            }
        }
    ]
}

def detect_clinical_category(transcript: str, body_regions: Optional[List[str]] = None) -> str:
    """
    Classifies user's chief complaint into one of 6 primary clinical branches.
    Uses regex keyword matching across en, hi, mr and anatomical body regions.
    """
    t = transcript.lower()
    regions = [r.lower() for r in (body_regions or [])]

    # Cardiac check
    cardiac_terms = ["chest", "heart", "angina", "palpitation", "छाती", "सीने", "हृदय", "छातीत"]
    if any(k in t for k in cardiac_terms) or "chest" in regions:
        return "cardiac_chest"

    # Neuro check
    neuro_terms = ["headache", "head", "stroke", "paralysis", "slurred", "faint", "seizure", "सिरदर्द", "सिर", "चक्कर", "डोकेदुखी", "डोके", "बेशुद्ध", "अर्धांगवायू"]
    if any(k in t for k in neuro_terms) or "head" in regions:
        return "neurological_headache"

    # Respiratory check
    resp_terms = ["breath", "suffocat", "gasp", "asthma", "wheez", "cough", "सांस", "दम", "श्वास", "खोकला"]
    if any(k in t for k in resp_terms):
        return "respiratory_breathing"

    # Abdominal check
    abdo_terms = ["abdom", "stomach", "belly", "appendix", "vomit", "nausea", "diarrhea", "पेट", "दस्त", "उल्टी", "पोट", "जुलाब"]
    if any(k in t for k in abdo_terms) or "abdomen" in regions:
        return "abdominal_pain"

    # Trauma check
    trauma_terms = ["bleed", "cut", "lacerat", "wound", "accident", "fracture", "fall", "injury", "ankle", "sprain", "चोट", "खून", "घाव", "जखम", "रक्त", "लचक"]
    if any(k in t for k in trauma_terms) or "legs" in regions or "arms" in regions:
        return "trauma_laceration"

    # Fever check
    fever_terms = ["fever", "temp", "chill", "cold", "shiver", "बुखार", "ताप", "थंडी"]
    if any(k in t for k in fever_terms):
        return "fever_infection"

    return "cardiac_chest"


def get_already_asked_facets(messages: List[Dict[str, Any]]) -> List[str]:
    """
    Inspects prior assistant questions and user answers in the session transcript
    to determine which clinical facets have already been probed.
    """
    asked_facets = set()
    full_text = " ".join([m.get("text", "").lower() for m in messages])

    for category, facets in CLINICAL_TREES.items():
        for f in facets:
            facet_name = f["facet"]
            keywords = f.get("keywords", [])
            hits = sum(1 for kw in keywords if kw.lower() in full_text)
            if hits >= 2:
                asked_facets.add(facet_name)

    return list(asked_facets)


def get_next_clinical_facet(
    category: str,
    already_asked: List[str],
    language: str = "en"
) -> Optional[Dict[str, Any]]:
    """
    Selects the next unasked clinical facet for the determined category.
    Returns question text, quick replies, facet name, and whether all facets are exhausted.
    """
    branch = CLINICAL_TREES.get(category, CLINICAL_TREES["cardiac_chest"])
    lang_key = language if language in ["en", "hi", "mr"] else "en"

    unasked = [f for f in branch if f["facet"] not in already_asked]
    if not unasked:
        return None

    next_facet = unasked[0]
    question_text = next_facet["questions"].get(lang_key, next_facet["questions"]["en"])
    quick_replies = next_facet["quick_replies"].get(lang_key, next_facet["quick_replies"]["en"])

    return {
        "facet": next_facet["facet"],
        "question": question_text,
        "quick_replies": quick_replies,
        "is_last_facet": len(unasked) == 1
    }
