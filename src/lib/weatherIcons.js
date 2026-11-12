export function weatherIconUrl(iconCode) {
    const suppliedCode = String(iconCode || '01d').trim().toLowerCase();
    const safeIconCode = /^\d{2}[dn]$/.test(suppliedCode) ? suppliedCode : '01d';
    const condition = safeIconCode.slice(0, 2);
    const isDay = safeIconCode.endsWith('d');

    const sun = '<g stroke="#e8892d" stroke-width="3.5" stroke-linecap="round">' +
      '<path d="M32 4v7M32 53v7M4 32h7M53 32h7M11.5 11.5l5 5M47 47l5.5 5.5M52.5 11.5 47 17M17 47l-5.5 5.5"/>' +
      '</g><circle cx="32" cy="32" r="13.5" fill="#f7aa43" stroke="#e8892d" stroke-width="2"/>';
    const sunBehindCloud = '<g stroke="#e8892d" stroke-width="2.8" stroke-linecap="round">' +
      '<path d="M44 3v5M44 34v5M25 20h5M58 20h4M30.5 7.5l3.5 3.5M54 29l3.5 3.5M57.5 7.5 54 11M34 29l-3.5 3.5"/>' +
      '</g><circle cx="44" cy="20" r="8.5" fill="#f7aa43" stroke="#e8892d" stroke-width="1.8"/>';
    const moon = '<path d="M42 9a22 22 0 1 0 13 39A21 21 0 0 1 42 9Z" fill="#e7cf88" stroke="#b39b5c" stroke-width="1.5"/>' +
      '<circle cx="15" cy="17" r="1.5" fill="#95a9b7"/><circle cx="48" cy="12" r="1.4" fill="#95a9b7"/>';
    const moonBehindCloud = '<path d="M48 7a15 15 0 1 0 9 27A14 14 0 0 1 48 7Z" fill="#e7cf88" stroke="#b39b5c" stroke-width="1.4"/>' +
      '<circle cx="33" cy="12" r="1.3" fill="#95a9b7"/>';
    const cloud = '<path d="M13 47h38a9 9 0 0 0 0-18h-2a14 14 0 0 0-26.6-2.6A11 11 0 0 0 13 47Z" fill="#f6f8fa" stroke="#a7b8c4" stroke-width="1.8" stroke-linejoin="round"/>';
    const cloudPair = '<path d="M31 35h18a7 7 0 0 0 0-14h-1a10 10 0 0 0-19-1.6A8 8 0 0 0 31 35Z" fill="#d9e2e6" stroke="#a7b8c4" stroke-width="1.6" stroke-linejoin="round"/>' + cloud;
    const overcast = '<path d="M30 42h21a8 8 0 0 0 0-16h-1a11 11 0 0 0-21-2A9 9 0 0 0 30 42Z" fill="#65747c" stroke="#45545d" stroke-width="1.8" stroke-linejoin="round"/>' +
      '<path d="M12 50h37a9 9 0 0 0 0-18h-2a14 14 0 0 0-26.6-2.6A11 11 0 0 0 12 50Z" fill="#8a979e" stroke="#586871" stroke-width="1.8" stroke-linejoin="round"/>';
    const rain = '<g fill="#348eae">' +
      '<path d="M21 49c0 2-3 4.3-3 6.2a3 3 0 0 0 6 0c0-1.9-3-4.2-3-6.2Z"/>' +
      '<path d="M33 49c0 2-3 4.3-3 6.2a3 3 0 0 0 6 0c0-1.9-3-4.2-3-6.2Z"/>' +
      '<path d="M45 49c0 2-3 4.3-3 6.2a3 3 0 0 0 6 0c0-1.9-3-4.2-3-6.2Z"/>' +
      '</g>';
    const lightning = '<path d="M35 38h-8l-4 12h7l-2 12 13-17h-8l4-7Z" fill="#f3bd43" stroke="#d79721" stroke-width="1.5" stroke-linejoin="round"/>';
    const snow = '<g stroke="#4d9db6" stroke-width="2" stroke-linecap="round">' +
      '<path d="M23 49v10m-5-8 10 6m0-6-10 6M43 49v10m-5-8 10 6m0-6-10 6"/>' +
      '</g>';

    let illustration;
    switch (condition) {
      case '01':
        illustration = isDay ? sun : moon;
        break;
      case '02':
        illustration = (isDay ? sunBehindCloud : moonBehindCloud) + cloud;
        break;
      case '03':
        illustration = cloudPair;
        break;
      case '04':
        illustration = overcast;
        break;
      case '09':
        illustration = cloud + rain;
        break;
      case '10':
        illustration = (isDay ? sunBehindCloud : moonBehindCloud) + cloud + rain;
        break;
      case '11':
        illustration = '<path d="M13 44h38a9 9 0 0 0 0-18h-2a14 14 0 0 0-26.6-2.6A11 11 0 0 0 13 44Z" fill="#65747c" stroke="#45545d" stroke-width="1.8" stroke-linejoin="round"/>' +
          lightning + '<g fill="#348eae"><circle cx="19" cy="53" r="2.2"/><circle cx="46" cy="55" r="2.2"/></g>';
        break;
      case '13':
        illustration = cloud + snow;
        break;
      case '50':
        illustration = '<g fill="none" stroke="#8497a0" stroke-width="3" stroke-linecap="round">' +
          '<path d="M12 23h40M7 33h43M13 43h39M20 53h27"/></g>';
        break;
      default:
        illustration = cloud;
    }

    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">' +
      illustration + '</svg>';
    return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
  }
