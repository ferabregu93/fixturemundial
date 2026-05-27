export const TEAMS = {
  MEX:{name:"México",flag:"🇲🇽",rank:16}, ZAF:{name:"Sudáfrica",flag:"🇿🇦",rank:58},
  KOR:{name:"Corea del Sur",flag:"🇰🇷",rank:22}, CZE:{name:"Chequia",flag:"🇨🇿",rank:37},
  CAN:{name:"Canadá",flag:"🇨🇦",rank:42}, BIH:{name:"Bosnia-Herz.",flag:"🇧🇦",rank:55},
  QAT:{name:"Catar",flag:"🇶🇦",rank:34}, SUI:{name:"Suiza",flag:"🇨🇭",rank:19},
  BRA:{name:"Brasil",flag:"🇧🇷",rank:5}, MAR:{name:"Marruecos",flag:"🇲🇦",rank:14},
  HTI:{name:"Haití",flag:"🇭🇹",rank:83}, SCO:{name:"Escocia",flag:"🏴󠁧󠁢󠁳󠁣󠁴󠁿",rank:39},
  USA:{name:"EE.UU.",flag:"🇺🇸",rank:11}, PRY:{name:"Paraguay",flag:"🇵🇾",rank:61},
  AUS:{name:"Australia",flag:"🇦🇺",rank:23}, TUR:{name:"Turquía",flag:"🇹🇷",rank:40},
  GER:{name:"Alemania",flag:"🇩🇪",rank:12}, CUW:{name:"Curazao",flag:"🇨🇼",rank:85},
  CIV:{name:"Costa de Marfil",flag:"🇨🇮",rank:28}, ECU:{name:"Ecuador",flag:"🇪🇨",rank:29},
  NED:{name:"Países Bajos",flag:"🇳🇱",rank:8}, JPN:{name:"Japón",flag:"🇯🇵",rank:16},
  SWE:{name:"Suecia",flag:"🇸🇪",rank:25}, TUN:{name:"Túnez",flag:"🇹🇳",rank:30},
  BEL:{name:"Bélgica",flag:"🇧🇪",rank:3}, EGY:{name:"Egipto",flag:"🇪🇬",rank:35},
  IRN:{name:"Irán",flag:"🇮🇷",rank:21}, NZL:{name:"Nueva Zelanda",flag:"🇳🇿",rank:91},
  ESP:{name:"España",flag:"🇪🇸",rank:1}, CPV:{name:"Cabo Verde",flag:"🇨🇻",rank:72},
  KSA:{name:"Arabia Saudí",flag:"🇸🇦",rank:56}, URU:{name:"Uruguay",flag:"🇺🇾",rank:15},
  FRA:{name:"Francia",flag:"🇫🇷",rank:2}, SEN:{name:"Senegal",flag:"🇸🇳",rank:20},
  IRQ:{name:"Irak",flag:"🇮🇶",rank:63}, NOR:{name:"Noruega",flag:"🇳🇴",rank:31},
  ARG:{name:"Argentina",flag:"🇦🇷",rank:4}, ALG:{name:"Argelia",flag:"🇩🇿",rank:45},
  AUT:{name:"Austria",flag:"🇦🇹",rank:26}, JOR:{name:"Jordania",flag:"🇯🇴",rank:66},
  POR:{name:"Portugal",flag:"🇵🇹",rank:6}, COD:{name:"DR Congo",flag:"🇨🇩",rank:43},
  UZB:{name:"Uzbekistán",flag:"🇺🇿",rank:68}, COL:{name:"Colombia",flag:"🇨🇴",rank:9},
  ENG:{name:"Inglaterra",flag:"🏴󠁧󠁢󠁥󠁮󠁧󠁿",rank:7}, CRO:{name:"Croacia",flag:"🇭🇷",rank:10},
  GHA:{name:"Ghana",flag:"🇬🇭",rank:60}, PAN:{name:"Panamá",flag:"🇵🇦",rank:79},
};

export const GROUPS = {
  A:{teams:["MEX","ZAF","KOR","CZE"]}, B:{teams:["CAN","BIH","QAT","SUI"]},
  C:{teams:["BRA","MAR","HTI","SCO"]}, D:{teams:["USA","PRY","AUS","TUR"]},
  E:{teams:["GER","CUW","CIV","ECU"]}, F:{teams:["NED","JPN","SWE","TUN"]},
  G:{teams:["BEL","EGY","IRN","NZL"]}, H:{teams:["ESP","CPV","KSA","URU"]},
  I:{teams:["FRA","SEN","IRQ","NOR"]}, J:{teams:["ARG","ALG","AUT","JOR"]},
  K:{teams:["POR","COD","UZB","COL"]}, L:{teams:["ENG","CRO","GHA","PAN"]},
};

export const R32_STRUCTURE = [
  {id:"P73",label:"P73 · Dom 28/06",slotA:"2A",slotB:"2B"},
  {id:"P74",label:"P74 · Lun 29/06",slotA:"1E",slotB:"3°(A-B-C-D-F)"},
  {id:"P75",label:"P75 · Lun 29/06",slotA:"1F",slotB:"2C"},
  {id:"P76",label:"P76 · Lun 29/06",slotA:"1C",slotB:"2F"},
  {id:"P77",label:"P77 · Mar 30/06",slotA:"1I",slotB:"3°(C-D-F-G-H)"},
  {id:"P78",label:"P78 · Mar 30/06",slotA:"2E",slotB:"2I"},
  {id:"P79",label:"P79 · Mar 30/06",slotA:"1A",slotB:"3°(C-E-F-H-I)"},
  {id:"P80",label:"P80 · Mié 01/07",slotA:"1L",slotB:"3°(E-H-I-J-K)"},
  {id:"P81",label:"P81 · Mié 01/07",slotA:"1D",slotB:"3°(B-E-F-I-J)"},
  {id:"P82",label:"P82 · Mié 01/07",slotA:"1G",slotB:"3°(A-E-H-I-J)"},
  {id:"P83",label:"P83 · Jue 02/07",slotA:"2K",slotB:"2L"},
  {id:"P84",label:"P84 · Jue 02/07",slotA:"1H",slotB:"2J"},
  {id:"P85",label:"P85 · Vie 03/07",slotA:"1B",slotB:"3°(E-F-G-I-J)"},
  {id:"P86",label:"P86 · Vie 03/07",slotA:"1J",slotB:"2H"},
  {id:"P87",label:"P87 · Vie 03/07",slotA:"1K",slotB:"3°(D-E-I-J-L)"},
  {id:"P88",label:"P88 · Vie 03/07",slotA:"2D",slotB:"2G"},
];

export const QF_STRUCTURE = [
  {id:"P89",label:"P89 · Sáb 04/07",srcA:"P74",srcB:"P77"},
  {id:"P90",label:"P90 · Sáb 04/07",srcA:"P73",srcB:"P75"},
  {id:"P91",label:"P91 · Dom 05/07",srcA:"P76",srcB:"P78"},
  {id:"P92",label:"P92 · Dom 05/07",srcA:"P79",srcB:"P80"},
  {id:"P93",label:"P93 · Lun 06/07",srcA:"P83",srcB:"P84"},
  {id:"P94",label:"P94 · Lun 06/07",srcA:"P81",srcB:"P82"},
  {id:"P95",label:"P95 · Mar 07/07",srcA:"P86",srcB:"P88"},
  {id:"P96",label:"P96 · Mar 07/07",srcA:"P85",srcB:"P87"},
];

export const SF4_STRUCTURE = [
  {id:"P97", label:"P97 · Jue 09/07",srcA:"P89",srcB:"P90"},
  {id:"P98", label:"P98 · Vie 10/07",srcA:"P93",srcB:"P94"},
  {id:"P99", label:"P99 · Sáb 11/07",srcA:"P91",srcB:"P92"},
  {id:"P100",label:"P100 · Sáb 11/07",srcA:"P95",srcB:"P96"},
];

export const SF2_STRUCTURE = [
  {id:"P101",label:"P101 · Mar 14/07",srcA:"P97",srcB:"P99"},
  {id:"P102",label:"P102 · Mié 15/07",srcA:"P98",srcB:"P100"},
];