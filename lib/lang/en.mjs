// English language pack — academic writing (APA 7), formal correspondence and
// plain-language rules from public style authorities.

export const authorities = [
  {
    id: 'APA7',
    title: 'Publication Manual of the American Psychological Association, 7th edition',
    issuer: 'American Psychological Association',
    url: 'https://apastyle.apa.org/style-grammar-guidelines'
  },
  {
    id: 'CHICAGO17',
    title: 'The Chicago Manual of Style, 17th edition (notes-bibliography and author-date)',
    issuer: 'University of Chicago Press',
    url: 'https://www.chicagomanualofstyle.org/'
  },
  {
    id: 'PLAIN',
    title: 'Federal Plain Language Guidelines',
    issuer: 'Plain Language Action and Information Network (plainlanguage.gov)',
    url: 'https://www.plainlanguage.gov/guidelines/'
  },
  {
    id: 'EU-EN',
    title: 'English Style Guide — official correspondence and drafting conventions',
    issuer: 'Publications Office of the European Union',
    url: 'https://publications.europa.eu/code/en/en-000100.htm'
  },
  {
    id: 'GOVUK',
    title: 'Style guide: writing for the web, academic and official tone',
    issuer: 'GOV.UK',
    url: 'https://www.gov.uk/guidance/style-guide'
  }
];

const A = { APA: 'APA7', CHI: 'CHICAGO17', PLAIN: 'PLAIN', EU: 'EU-EN', GOV: 'GOVUK' };

export const rules = [
  { id: 'EN-ORT-001', category: 'spelling', severity: 'error', authority: A.GOV, autoFix: true, register: 'all',
    title: 'Frequently misspelled words',
    patterns: [
      [/(?<![\p{L}\p{N}_])recieve(?![\p{L}\p{N}_])/gi, 'receive'], [/(?<![\p{L}\p{N}_])recieved(?![\p{L}\p{N}_])/gi, 'received'], [/(?<![\p{L}\p{N}_])occured(?![\p{L}\p{N}_])/gi, 'occurred'],
      [/(?<![\p{L}\p{N}_])occurence(?![\p{L}\p{N}_])/gi, 'occurrence'], [/(?<![\p{L}\p{N}_])seperate(?![\p{L}\p{N}_])/gi, 'separate'], [/(?<![\p{L}\p{N}_])definately(?![\p{L}\p{N}_])/gi, 'definitely'],
      [/(?<![\p{L}\p{N}_])accomodate(?![\p{L}\p{N}_])/gi, 'accommodate'], [/(?<![\p{L}\p{N}_])untill(?![\p{L}\p{N}_])/gi, 'until'], [/(?<![\p{L}\p{N}_])alot(?![\p{L}\p{N}_])/gi, 'a lot'],
      [/(?<![\p{L}\p{N}_])teh(?![\p{L}\p{N}_])/gi, 'the'], [/(?<![\p{L}\p{N}_])wich(?![\p{L}\p{N}_])/gi, 'which'], [/(?<![\p{L}\p{N}_])goverment(?![\p{L}\p{N}_])/gi, 'government'],
      [/(?<![\p{L}\p{N}_])enviroment(?![\p{L}\p{N}_])/gi, 'environment'], [/(?<![\p{L}\p{N}_])experiance(?![\p{L}\p{N}_])/gi, 'experience'], [/(?<![\p{L}\p{N}_])occassion(?![\p{L}\p{N}_])/gi, 'occasion'],
      [/(?<![\p{L}\p{N}_])recomend(?![\p{L}\p{N}_])/gi, 'recommend'], [/(?<![\p{L}\p{N}_])refered(?![\p{L}\p{N}_])/gi, 'referred'], [/(?<![\p{L}\p{N}_])transfered(?![\p{L}\p{N}_])/gi, 'transferred'],
      [/(?<![\p{L}\p{N}_])begining(?![\p{L}\p{N}_])/gi, 'beginning'], [/(?<![\p{L}\p{N}_])concious(?![\p{L}\p{N}_])/gi, 'conscious'], [/(?<![\p{L}\p{N}_])independant(?![\p{L}\p{N}_])/gi, 'independent'],
      [/(?<![\p{L}\p{N}_])thier(?![\p{L}\p{N}_])/gi, 'their'], [/(?<![\p{L}\p{N}_])writting(?![\p{L}\p{N}_])/gi, 'writing'], [/(?<![\p{L}\p{N}_])calender(?![\p{L}\p{N}_])/gi, 'calendar'],
      [/(?<![\p{L}\p{N}_])dissapear(?![\p{L}\p{N}_])/gi, 'disappear'], [/(?<![\p{L}\p{N}_])neccessary(?![\p{L}\p{N}_])/gi, 'necessary'], [/(?<![\p{L}\p{N}_])publically(?![\p{L}\p{N}_])/gi, 'publicly'],
      [/(?<![\p{L}\p{N}_])irregardless(?![\p{L}\p{N}_])/gi, 'regardless'], [/(?<![\p{L}\p{N}_])perfromance(?![\p{L}\p{N}_])/gi, 'performance'], [/(?<![\p{L}\p{N}_])sustainible(?![\p{L}\p{N}_])/gi, 'sustainable']
    ] },
  { id: 'EN-ORT-002', category: 'spelling', severity: 'error', authority: A.APA, autoFix: true, register: ['academic', 'thesis'],
    title: 'Academic text avoids contractions',
    patterns: [
      [/(?<![\p{L}\p{N}_])don't(?![\p{L}\p{N}_])/gi, 'do not'], [/(?<![\p{L}\p{N}_])doesn't(?![\p{L}\p{N}_])/gi, 'does not'], [/(?<![\p{L}\p{N}_])didn't(?![\p{L}\p{N}_])/gi, 'did not'],
      [/(?<![\p{L}\p{N}_])can't(?![\p{L}\p{N}_])/gi, 'cannot'], [/(?<![\p{L}\p{N}_])won't(?![\p{L}\p{N}_])/gi, 'will not'], [/(?<![\p{L}\p{N}_])isn't(?![\p{L}\p{N}_])/gi, 'is not'],
      [/(?<![\p{L}\p{N}_])aren't(?![\p{L}\p{N}_])/gi, 'are not'], [/(?<![\p{L}\p{N}_])wasn't(?![\p{L}\p{N}_])/gi, 'was not'], [/(?<![\p{L}\p{N}_])weren't(?![\p{L}\p{N}_])/gi, 'were not'],
      [/(?<![\p{L}\p{N}_])haven't(?![\p{L}\p{N}_])/gi, 'have not'], [/(?<![\p{L}\p{N}_])hasn't(?![\p{L}\p{N}_])/gi, 'has not'], [/(?<![\p{L}\p{N}_])hadn't(?![\p{L}\p{N}_])/gi, 'had not'],
      [/(?<![\p{L}\p{N}_])it's own(?![\p{L}\p{N}_])/gi, 'its own'], [/(?<![\p{L}\p{N}_])we'll(?![\p{L}\p{N}_])/gi, 'we will'], [/(?<![\p{L}\p{N}_])they're(?![\p{L}\p{N}_])(?=\s+(?:own|way))/gi, 'their'],
      [/(?<![\p{L}\p{N}_])I'm(?![\p{L}\p{N}_])/gi, 'I am'], [/(?<![\p{L}\p{N}_])you're(?![\p{L}\p{N}_])(?=\s+(?:the|a))/gi, 'you are'], [/(?<![\p{L}\p{N}_])there's(?![\p{L}\p{N}_])/gi, 'there is']
    ] },
  { id: 'EN-ORT-003', category: 'grammar', severity: 'error', authority: A.GOV, autoFix: true, register: 'all',
    title: 'Common confusions: its/it\'s, then/than, affect/effect, less/fewer',
    patterns: [
      [/(?<![\p{L}\p{N}_])its a(?![\p{L}\p{N}_])/gi, "it's a"],
      [/(?<![\p{L}\p{N}_])less (participants|samples|trees|items|examples|people|respondents|cases|words|pages)(?![\p{L}\p{N}_])/gi, (_, word) => `fewer ${word}`],
      [/(?<![\p{L}\p{N}_])comprised of(?![\p{L}\p{N}_])/gi, 'composed of'], [/(?<![\p{L}\p{N}_])more (\w+)er(?![\p{L}\p{N}_])/gi, (_, stem) => `${stem}er`],
      [/(?<![\p{L}\p{N}_])could of(?![\p{L}\p{N}_])/gi, 'could have'], [/(?<![\p{L}\p{N}_])should of(?![\p{L}\p{N}_])/gi, 'should have'], [/(?<![\p{L}\p{N}_])would of(?![\p{L}\p{N}_])/gi, 'would have'],
      [/(?<![\p{L}\p{N}_])must of(?![\p{L}\p{N}_])/gi, 'must have'], [/(?<![\p{L}\p{N}_])might of(?![\p{L}\p{N}_])/gi, 'might have']
    ] },
  { id: 'EN-PUN-001', category: 'punctuation', severity: 'error', authority: A.GOV, autoFix: true, register: 'all',
    title: 'No space before punctuation, exactly one space after it',
    lineGuard: /[^\S\n]{3,}:/u,
    patterns: [
      [/[^\S\n]*([,.;:!?])(?=[^\s\d"'’”)\]….,;:!?<>=+%\-*/\\|#^~`{])/g, '$1 '],
      [/[^\S\n]+([,.;:!?])/g, '$1'],
      [/(?<!\p{Lu}\p{Ll}{0,4})\.(?=[a-z])/g, '. '],
      [/[ ]{2,4}(?=\S)/g, ' '],
      [/,,+/g, ','], [/;;+/g, ';'], [/!!+/g, '!'], [/\?\?+/g, '?'],
      [/\(\s+/g, '('], [/[^\S\n]+\)/g, ')']
    ] },
  { id: 'EN-PUN-002', category: 'punctuation', severity: 'warning', authority: A.CHI, autoFix: false, register: 'all',
    title: 'Serial (Oxford) comma use must be consistent',
    patterns: [[/,\s+and\s+/gi, null], [/\w+,\s+\w+\s+and\s+\w+/gi, null]] },
  { id: 'EN-CIT-001', category: 'citation', severity: 'error', authority: A.APA, autoFix: true, register: ['academic', 'thesis'],
    title: 'APA 7 in-text citation: comma before the year, "et al." with a full stop',
    patterns: [
      [/\(([^()]{2,120}?et al\.?)\s+((?:19|20)\d{2}[a-z]?)\)/gi, '($1, $2)'],
      [/(?<![\p{L}\p{N}_])et al(?!\.)/gi, 'et al.'],
      [/\(([^()]{2,120}?);\s*((?:19|20)\d{2}[a-z]?)\)/gi, '($1, $2)'],
      [/(?<![\p{L}\p{N}_])(?:pp\.|p\.)\s?(?=\d)/gi, null],
      [/(?<![\p{L}\p{N}_])doi:\s*/gi, 'https://doi.org/'],
      [/https?:\/\/dx\.doi\.org\//gi, 'https://doi.org/']
    ] },
  { id: 'EN-STY-001', category: 'style', severity: 'warning', authority: A.PLAIN, autoFix: true, register: 'all',
    title: 'Wordiness and redundancy (Federal Plain Language Guidelines)',
    patterns: [
      [/(?<![\p{L}\p{N}_])in order to(?![\p{L}\p{N}_])/gi, 'to'],
      [/(?<![\p{L}\p{N}_])due to the fact that(?![\p{L}\p{N}_])/gi, 'because'],
      [/(?<![\p{L}\p{N}_])at this point in time(?![\p{L}\p{N}_])/gi, 'now'],
      [/(?<![\p{L}\p{N}_])at the present time(?![\p{L}\p{N}_])/gi, 'now'],
      [/(?<![\p{L}\p{N}_])for the purpose of(?![\p{L}\p{N}_])/gi, 'to'],
      [/(?<![\p{L}\p{N}_])in the event that(?![\p{L}\p{N}_])/gi, 'if'],
      [/(?<![\p{L}\p{N}_])in spite of the fact that(?![\p{L}\p{N}_])/gi, 'although'],
      [/(?<![\p{L}\p{N}_])(?:could|should|would|must|might) of(?![\p{L}\p{N}_])/gi, m => m.replace(' of', ' have')],
      [/(?<![\p{L}\p{N}_])comprised of(?![\p{L}\p{N}_])/gi, 'composed of'],
      [/(?<![\p{L}\p{N}_])basic fundamentals(?![\p{L}\p{N}_])/gi, 'fundamentals'],
      [/(?<![\p{L}\p{N}_])component parts(?![\p{L}\p{N}_])/gi, 'parts'],
      [/(?<![\p{L}\p{N}_])completely eliminate(?![\p{L}\p{N}_])/gi, 'eliminate'],
      [/(?<![\p{L}\p{N}_])final outcome(?![\p{L}\p{N}_])/gi, 'outcome'],
      [/(?<![\p{L}\p{N}_])past history(?![\p{L}\p{N}_])/gi, 'history'],
      [/(?<![\p{L}\p{N}_])future plans(?![\p{L}\p{N}_])/gi, 'plans'],
      [/(?<![\p{L}\p{N}_])unexpected surprise(?![\p{L}\p{N}_])/gi, 'surprise']
    ] },
  { id: 'EN-STY-006', category: 'style', severity: 'warning', authority: A.PLAIN, autoFix: true, register: ['business', 'journalistic', 'natural', 'official'],
    title: 'Plain language: replace inflated wording',
    patterns: [
      [/(?<![\p{L}\p{N}_])utiliz(?:e|es|ed|ing)(?![\p{L}\p{N}_])/gi, m => ({ e: 'use', es: 'uses', ed: 'used', ing: 'using' }[m[0].toLowerCase().slice(6)] || 'use')],
      [/(?<![\p{L}\p{N}_])utilise[sd]?(?![\p{L}\p{N}_])/gi, 'use'],
      [/(?<![\p{L}\p{N}_])prior to(?![\p{L}\p{N}_])/gi, 'before'],
      [/(?<![\p{L}\p{N}_])subsequent to(?![\p{L}\p{N}_])/gi, 'after'],
      [/(?<![\p{L}\p{N}_])commence[sd]?(?![\p{L}\p{N}_])/gi, 'begin'],
      [/(?<![\p{L}\p{N}_])terminate[sd]?(?![\p{L}\p{N}_])/gi, 'end'],
      [/(?<![\p{L}\p{N}_])facilitate[sd]?(?![\p{L}\p{N}_])/gi, 'support'],
      [/(?<![\p{L}\p{N}_])endeavor(?:s|ed)?(?![\p{L}\p{N}_])/gi, 'effort'],
      [/(?<![\p{L}\p{N}_])a large number of(?![\p{L}\p{N}_])/gi, 'many'],
      [/(?<![\p{L}\p{N}_])the majority of(?![\p{L}\p{N}_])/gi, 'most']
    ] },
  { id: 'EN-STY-002', category: 'style', severity: 'warning', authority: A.APA, autoFix: false, register: ['academic', 'thesis'],
    title: 'Academic caution: absolute claims should be hedged or evidenced',
    patterns: [
      [/(?<![\p{L}\p{N}_])proves that(?![\p{L}\p{N}_])/gi, null], [/(?<![\p{L}\p{N}_])always(?![\p{L}\p{N}_])/gi, null], [/(?<![\p{L}\p{N}_])never(?![\p{L}\p{N}_])/gi, null],
      [/(?<![\p{L}\p{N}_])undeniably(?![\p{L}\p{N}_])/gi, null], [/(?<![\p{L}\p{N}_])obviously(?![\p{L}\p{N}_])/gi, null], [/(?<![\p{L}\p{N}_])clearly(?![\p{L}\p{N}_])/gi, null],
      [/(?<![\p{L}\p{N}_])everyone knows(?![\p{L}\p{N}_])/gi, null], [/(?<![\p{L}\p{N}_])100%(?<![\p{L}\p{N}_])/gi, null], [/(?<![\p{L}\p{N}_])perfectly(?![\p{L}\p{N}_])/gi, null]
    ] },
  { id: 'EN-STY-003', category: 'style', severity: 'warning', authority: A.APA, autoFix: true, register: ['academic', 'thesis'],
    title: 'Academic register replaces colloquial intensifiers',
    patterns: [
      [/(?<![\p{L}\p{N}_])very big(?![\p{L}\p{N}_])/gi, 'substantial'], [/(?<![\p{L}\p{N}_])really important(?![\p{L}\p{N}_])/gi, 'significant'],
      [/(?<![\p{L}\p{N}_])a lot of(?![\p{L}\p{N}_])/gi, 'numerous'], [/(?<![\p{L}\p{N}_])lots of(?![\p{L}\p{N}_])/gi, 'numerous'], [/(?<![\p{L}\p{N}_])kind of(?![\p{L}\p{N}_])/gi, 'somewhat'],
      [/(?<![\p{L}\p{N}_])sort of(?![\p{L}\p{N}_])/gi, 'somewhat'], [/(?<![\p{L}\p{N}_])get(?![\p{L}\p{N}_])(?!\s+rid)/gi, 'obtain'], [/(?<![\p{L}\p{N}_])got(?![\p{L}\p{N}_])(?!\s+rid)/gi, 'obtained'],
      [/(?<![\p{L}\p{N}_])stuff(?![\p{L}\p{N}_])/gi, 'material'], [/(?<![\p{L}\p{N}_])things(?![\p{L}\p{N}_])/gi, 'factors'], [/(?<![\p{L}\p{N}_])okay(?![\p{L}\p{N}_])/gi, 'acceptable'],
      [/(?<![\p{L}\p{N}_])huge(?![\p{L}\p{N}_])/gi, 'considerable'], [/(?<![\p{L}\p{N}_])tiny(?![\p{L}\p{N}_])/gi, 'small'], [/(?<![\p{L}\p{N}_])find out(?![\p{L}\p{N}_])/gi, 'determine'],
      [/(?<![\p{L}\p{N}_])look into(?![\p{L}\p{N}_])/gi, 'examine'], [/(?<![\p{L}\p{N}_])come up with(?![\p{L}\p{N}_])/gi, 'propose'], [/(?<![\p{L}\p{N}_])show up(?![\p{L}\p{N}_])/gi, 'appear'],
      [/(?<![\p{L}\p{N}_])go up(?![\p{L}\p{N}_])/gi, 'increase'], [/(?<![\p{L}\p{N}_])go down(?![\p{L}\p{N}_])/gi, 'decrease'], [/(?<![\p{L}\p{N}_])set up(?![\p{L}\p{N}_])/gi, 'establish']
    ] },
  { id: 'EN-STR-001', category: 'structure', severity: 'warning', authority: A.PLAIN, autoFix: false, register: 'all',
    title: 'Sentences longer than 40 words should be split',
    patterns: [] },
  { id: 'EN-STR-002', category: 'structure', severity: 'warning', authority: A.EU, autoFix: false, register: ['official'],
    title: 'Official correspondence: subject line, reference and courteous closing',
    patterns: [[/(?<![\p{L}\p{N}_])Please find attached(?![\p{L}\p{N}_])/gi, null], [/(?<![\p{L}\p{N}_])Yours faithfully(?![\p{L}\p{N}_])/gi, null], [/(?<![\p{L}\p{N}_])Yours sincerely(?![\p{L}\p{N}_])/gi, null]] }
];

export const aiMarkers = [
  { re: /(?<![\p{L}\p{N}_])delve[sd]?(?![\p{L}\p{N}_])|(?<![\p{L}\p{N}_])delving(?![\p{L}\p{N}_])/gi, label: 'AI-typical verb', weight: 30 },
  { re: /(?<![\p{L}\p{N}_])tapestry(?![\p{L}\p{N}_])|(?<![\p{L}\p{N}_])mosaic of(?![\p{L}\p{N}_])/gi, label: 'AI-typical metaphor', weight: 34 },
  { re: /(?<![\p{L}\p{N}_])testament to(?![\p{L}\p{N}_])/gi, label: 'AI-typical metaphor', weight: 26 },
  { re: /(?<![\p{L}\p{N}_])in today's (?:digital|fast-paced|ever-changing) (?:world|age|landscape)/gi, label: 'Formulaic opening', weight: 30 },
  { re: /(?<![\p{L}\p{N}_])in the ever-evolving(?![\p{L}\p{N}_])|(?<![\p{L}\p{N}_])in the rapidly evolving(?![\p{L}\p{N}_])/gi, label: 'Formulaic opening', weight: 26 },
  { re: /(?<![\p{L}\p{N}_])it is (?:important|worth) (?:to note|noting) (?:that)?/gi, label: 'Formulaic metadiscourse', weight: 24 },
  { re: /(?<![\p{L}\p{N}_])plays a (?:crucial|vital|pivotal|key) role(?![\p{L}\p{N}_])/gi, label: 'Formulaic claim', weight: 26 },
  { re: /(?<![\p{L}\p{N}_])a myriad of(?![\p{L}\p{N}_])|(?<![\p{L}\p{N}_])myriad of(?![\p{L}\p{N}_])/gi, label: 'AI-typical quantifier', weight: 24 },
  { re: /(?<![\p{L}\p{N}_])navigate the complexities(?![\p{L}\p{N}_])|(?<![\p{L}\p{N}_])navigating the landscape(?![\p{L}\p{N}_])/gi, label: 'AI-typical metaphor', weight: 30 },
  { re: /(?<![\p{L}\p{N}_])the landscape of(?![\p{L}\p{N}_])|(?<![\p{L}\p{N}_])in the realm of(?![\p{L}\p{N}_])/gi, label: 'AI-typical metaphor', weight: 22 },
  { re: /(?<![\p{L}\p{N}_])foster(?:s|ing)?(?![\p{L}\p{N}_])|(?<![\p{L}\p{N}_])harness(?:es|ing)?(?![\p{L}\p{N}_])|(?<![\p{L}\p{N}_])leverage[sd]?(?![\p{L}\p{N}_])|(?<![\p{L}\p{N}_])unlock(?:s|ing)?(?![\p{L}\p{N}_])/gi, label: 'AI-typical verb', weight: 16 },
  { re: /(?<![\p{L}\p{N}_])seamless(?:ly)?(?![\p{L}\p{N}_])|(?<![\p{L}\p{N}_])robust(?![\p{L}\p{N}_])|(?<![\p{L}\p{N}_])holistic(?![\p{L}\p{N}_])|(?<![\p{L}\p{N}_])multifaceted(?![\p{L}\p{N}_])|(?<![\p{L}\p{N}_])cutting-edge(?![\p{L}\p{N}_])|(?<![\p{L}\p{N}_])state-of-the-art(?![\p{L}\p{N}_])/gi, label: 'AI-typical adjective', weight: 16 },
  { re: /(?<![\p{L}\p{N}_])comprehensive(?:ly)?(?![\p{L}\p{N}_])|(?<![\p{L}\p{N}_])thorough(?:ly)?(?![\p{L}\p{N}_])/gi, label: 'AI-typical adjective', weight: 10 },
  { re: /(?<![\p{L}\p{N}_])furthermore(?![\p{L}\p{N}_])|(?<![\p{L}\p{N}_])moreover(?![\p{L}\p{N}_])|(?<![\p{L}\p{N}_])additionally,/gi, label: 'Formulaic connective', weight: 14 },
  { re: /(?<![\p{L}\p{N}_])in conclusion,|(?<![\p{L}\p{N}_])to summarize,|(?<![\p{L}\p{N}_])overall,/gi, label: 'Formulaic closing', weight: 16 },
  { re: /(?<![\p{L}\p{N}_])when it comes to(?![\p{L}\p{N}_])|(?<![\p{L}\p{N}_])at the forefront of(?![\p{L}\p{N}_])|(?<![\p{L}\p{N}_])game[- ]changer(?![\p{L}\p{N}_])/gi, label: 'AI-typical phrase', weight: 24 },
  { re: /(?<![\p{L}\p{N}_])underscore[sd]?(?![\p{L}\p{N}_])|(?<![\p{L}\p{N}_])highlight(?:s|ing)? the (?:importance|need)(?![\p{L}\p{N}_])/gi, label: 'AI-typical verb', weight: 14 },
  { re: /(?<![\p{L}\p{N}_])pivotal(?![\p{L}\p{N}_])|(?<![\p{L}\p{N}_])crucially,|(?<![\p{L}\p{N}_])notably,|(?<![\p{L}\p{N}_])arguably,/gi, label: 'AI-typical adverb', weight: 12 },
  { re: /(?<![\p{L}\p{N}_])showcase[sd]?(?![\p{L}\p{N}_])|(?<![\p{L}\p{N}_])streamline[sd]?(?![\p{L}\p{N}_])|(?<![\p{L}\p{N}_])unleash(?:es)?(?![\p{L}\p{N}_])|(?<![\p{L}\p{N}_])elevate[sd]?(?![\p{L}\p{N}_])|(?<![\p{L}\p{N}_])embark on a journey(?![\p{L}\p{N}_])/gi, label: 'AI-typical verb', weight: 22 },
  { re: /(?<![\p{L}\p{N}_])it (?:is|was) (?:evident|clear|apparent) that(?![\p{L}\p{N}_])/gi, label: 'Unsupported assertion', weight: 18 },
  { re: /(?<![\p{L}\p{N}_])not only .{3,80} but also(?![\p{L}\p{N}_])/gi, label: 'Correlative pair pattern', weight: 10 },
  { re: /(?<![\p{L}\p{N}_])three (?:key|main|primary) (?:factors|reasons|elements|ways|aspects|themes)(?![\p{L}\p{N}_])/gi, label: 'Rule-of-three listing', weight: 18 },
  { re: /(?<![\p{L}\p{N}_])firstly,.{0,400}secondly,.{0,400}(?:thirdly|finally),/gisu, label: 'Mechanical enumeration', weight: 16 }
];

export const registers = {
  natural: {
    label: 'Natural',
    prompt: 'Write plainly and with human rhythm: vary sentence length, avoid formulaic openers and connective stacking, keep every fact, number and citation from the source.',
    transformations: { simplify: true, varyRhythm: true, removeCliches: true }
  },
  academic: {
    label: 'Academic',
    prompt: 'Write in academic English following APA 7 conventions: impersonal or first-person-plural voice used consistently, hedged claims, evidence verbs, no contractions, precise terminology. Preserve all data, citations, DOIs and units exactly; never invent sources, findings or examples.',
    transformations: { impersonal: true, nominalise: true, hedge: true, formalConnectives: true, citationNormalise: true }
  },
  thesis: {
    label: 'Thesis / report',
    prompt: 'Write in thesis style: keep section, table and figure references intact, separate method from results from discussion, preserve units and measurements, and use consistent hedged academic phrasing.',
    transformations: { impersonal: true, nominalise: true, hedge: true, keepStructure: true, citationNormalise: true }
  },
  official: {
    label: 'Formal correspondence',
    prompt: 'Write formal official correspondence: short declarative sentences, neutral tone, clear subject and reference lines, courteous closing ("Yours sincerely" for a named recipient, "Yours faithfully" otherwise), no contractions and no colloquialisms.',
    transformations: { concise: true, officialStructure: true, formalConnectives: true, keepStructure: true }
  },
  technical: {
    label: 'Technical',
    prompt: 'Write precise technical prose: keep standards, model names, units and measured values unchanged; separate observation from inference; use unambiguous terms.',
    transformations: { precise: true, keepTerms: true, varyRhythm: true }
  },
  business: {
    label: 'Business',
    prompt: 'Write professional business prose: short paragraphs, action-oriented verbs, polite and direct tone. Never add commitments, dates, prices or guarantees absent from the source.',
    transformations: { concise: true, actionOriented: true, varyRhythm: true }
  },
  journalistic: {
    label: 'News',
    prompt: 'Write news prose: active voice, concrete detail, short sentences. Separate verified fact from claim; never invent quotes, headlines or witnesses.',
    transformations: { concise: true, activeVoice: true, varyRhythm: true }
  },
  proofread: {
    label: 'Proofread only',
    prompt: 'Correct spelling, punctuation, agreement and formatting only. Do not change sentence structure, meaning, numbers, citations or voice.',
    transformations: { proofreadOnly: true }
  }
};

export const functionWords = ['the', 'of', 'and', 'to', 'in', 'a', 'is', 'that', 'for', 'with', 'as', 'on', 'by', 'it', 'be', 'are', 'was', 'this', 'from', 'or', 'an', 'at', 'which', 'has', 'have', 'were', 'not', 'but', 'they', 'their', 'can', 'will', 'would', 'there', 'been', 'more', 'when', 'such', 'into', 'about', 'than', 'also', 'its'];

export const stopwords = new Set(functionWords.concat(['we', 'you', 'he', 'she', 'his', 'her', 'its', 'our', 'your', 'do', 'does', 'did', 'if', 'then', 'so', 'no', 'yes', 'up', 'down', 'out', 'off', 'over', 'under', 'again', 'once']));

export const foreignTerms = [];

export const pack = {
  locale: 'en',
  name: 'English academic and formal writing pack',
  version: '2026.10',
  authorities,
  rules,
  aiMarkers,
  registers,
  functionWords,
  stopwords,
  foreignTerms,
  connectiveGroups: [
    ['In addition', 'Furthermore', 'Moreover', 'Also'],
    ['However', 'Nevertheless', 'By contrast', 'Yet'],
    ['Therefore', 'Consequently', 'As a result', 'Thus'],
    ['In summary', 'Taken together', 'Overall', 'In short'],
    ['For example', 'For instance', 'Specifically', 'In particular']
  ],
  hedges: ['suggests', 'indicates', 'appears to', 'may', 'is likely to', 'seems to', 'tends to'],
  formalVerbs: ['determined', 'identified', 'observed', 'measured', 'assessed', 'evaluated', 'calculated', 'examined', 'reported']
};

export default pack;
