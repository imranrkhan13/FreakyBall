const API_FOOTBALL_KEY = 'fd2dc4c6a807b23a05887bd5a6a5fe39';
const LEAGUES = {
    'Premier League': 39,
    'Champions League': 2
};
let selectedLeague = 'Premier League';

const apiCache = {
    fixtures: {},
    events: {},
    stats: {},
    lineups: {},
    players: {}
};

function createDateList() {
    const dateListContainer = document.createElement('div');
    dateListContainer.id = 'date-list-container';
    dateListContainer.className = 'date-list-container';

    const dateList = document.createElement('div');
    dateList.id = 'date-list';
    dateList.className = 'date-list';

    dateListContainer.appendChild(dateList);

    const trigger = document.createElement('div');
    trigger.className = 'date-list-trigger';
    document.body.appendChild(trigger);

    document.body.appendChild(dateListContainer);

    populateDateList(dateList);

    const currentDateElement = document.querySelector('.date-item.current-date');
    if (currentDateElement) {
        dateListContainer.scrollTop = currentDateElement.offsetTop - dateListContainer.offsetHeight / 2 + currentDateElement.offsetHeight / 2;
        currentDateElement.classList.add('selected');
    }

    setTimeout(() => {
        getMatches(new Date());
    }, 100);

    let timeout;
    trigger.addEventListener('mouseenter', () => {
        clearTimeout(timeout);
        dateListContainer.classList.add('active');
        document.getElementById('matches').classList.add('menu-open');
    });

    dateListContainer.addEventListener('mouseleave', () => {
        timeout = setTimeout(() => {
            dateListContainer.classList.remove('active');
            document.getElementById('matches').classList.remove('menu-open');
        }, 300);
    });

    trigger.addEventListener('mouseleave', () => {
        timeout = setTimeout(() => {
            if (!dateListContainer.matches(':hover')) {
                dateListContainer.classList.remove('active');
                document.getElementById('matches').classList.remove('menu-open');
            }
        }, 300);
    });
}

document.addEventListener('DOMContentLoaded', createDateList);

function populateDateList(dateList) {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    const yesterday = new Date(currentDate);
    yesterday.setDate(currentDate.getDate() - 1);
    const tomorrow = new Date(currentDate);
    tomorrow.setDate(currentDate.getDate() + 1);

    const pastDates = [];
    for (let i = 365; i >= 1; i--) {
        const date = new Date(currentDate);
        date.setDate(currentDate.getDate() - i);
        pastDates.push(date);
    }

    const futureDates = [];
    for (let i = 1; i <= 180; i++) {
        const date = new Date(currentDate);
        date.setDate(currentDate.getDate() + i);
        futureDates.push(date);
    }

    pastDates.forEach(date => {
        createDateItem(date, currentDate, yesterday, tomorrow, dateList);
    });

    createDateItem(new Date(currentDate), currentDate, yesterday, tomorrow, dateList);

    futureDates.forEach(date => {
        createDateItem(date, currentDate, yesterday, tomorrow, dateList);
    });
}

function createDateItem(date, currentDate, yesterday, tomorrow, dateList) {
    const dateItem = document.createElement('div');
    dateItem.className = 'date-item';

    const dateIcon = document.createElement('span');
    dateIcon.className = 'date-icon';
    dateIcon.textContent = '📅';

    const dateText = document.createElement('span');
    dateText.className = 'date-text';

    if (date.toDateString() === currentDate.toDateString()) {
        dateText.textContent = 'Today';
        dateItem.classList.add('current-date');
    } else if (date.toDateString() === yesterday.toDateString()) {
        dateText.textContent = 'Yesterday';
    } else if (date.toDateString() === tomorrow.toDateString()) {
        dateText.textContent = 'Tomorrow';
    } else {
        dateText.textContent = formatDateLabel(date);
    }

    dateItem.appendChild(dateIcon);
    dateItem.appendChild(dateText);
    dateItem.setAttribute('data-date', formatDate(date));

    dateItem.addEventListener('click', function () {
        document.querySelectorAll('.date-item').forEach(item => item.classList.remove('selected'));
        this.classList.add('selected');
        const selectedDate = this.getAttribute('data-date');
        const [year, month, day] = selectedDate.split('-');
        const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        getMatches(dateObj);
    });

    dateList.appendChild(dateItem);
}

async function getMatches(date) {
    try {
        const matchesDiv = document.getElementById('matches');
        let errorDiv = document.getElementById('error');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'error';
            document.body.insertBefore(errorDiv, matchesDiv);
        }

        matchesDiv.innerHTML = '';
        errorDiv.innerHTML = '';
        errorDiv.style.display = 'none';

        const formattedDate = formatDate(date);
        let allMatches = [];
        let noMatchesScheduled = true;

        // Check cache first
        const cacheKey = formattedDate;

        for (const [leagueName, leagueId] of Object.entries(LEAGUES)) {
            let response;

            if (apiCache.fixtures[`${cacheKey}-${leagueId}`]) {
                response = apiCache.fixtures[`${cacheKey}-${leagueId}`];
                console.log(`Using cached data for ${leagueName}`);
            } else {
                response = await fetchMatches(formattedDate, leagueId);
                apiCache.fixtures[`${cacheKey}-${leagueId}`] = response;
            }

            console.log("Full API Response: ", response);

            if (response.errors && Object.keys(response.errors).length > 0) {
                console.log("Error Object: ", response.errors);

                if (response.errors.rateLimit) {
                    throw new Error('Whoa there, speedy! 🏃‍♂️💨 You\'re going too fast! The limit is 10 requests per minute. Take a breather and try again in a moment! ⏰');
                } else if (response.errors.requests) {
                    const errorMessage = response.errors.requests;

                    if (errorMessage.includes('request limit for the day')) {
                        throw new Error('Oops! 😅 Looks like we\'ve hit the daily limit! Guess you\'ll have to come back tomorrow. See you then! 👋✨');
                    } else if (errorMessage.includes('Too many requests')) {
                        throw new Error('Easy there, tiger! 🐯 You\'re making too many requests! The limit is 10 per minute. Slow down a bit! 🐌💙');
                    } else {
                        throw new Error(errorMessage);
                    }
                } else {
                    throw new Error('Uh oh! 😬 Something went wrong while fetching matches: ' + JSON.stringify(response.errors));
                }
            }

            if (response.response) {
                allMatches = allMatches.concat(response.response.map(match => ({ ...match, leagueName })));
                noMatchesScheduled = false;
            }
        }

        if (noMatchesScheduled) {
            errorDiv.innerHTML = `No matches scheduled for ${formatDateLabel(date)}`;
            errorDiv.style.display = 'block';
        } else {
            displayMatches(allMatches, formatDateLabel(date), formattedDate);
        }

    } catch (error) {
        console.error('Error fetching matches:', error);
        const matchesDiv = document.getElementById('matches');
        let errorDiv = document.getElementById('error');

        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'error';
            document.body.insertBefore(errorDiv, matchesDiv);
        }

        matchesDiv.innerHTML = '';
        errorDiv.innerHTML = `<div style="color: #ff4444; background: rgba(255, 68, 68, 0.1); padding: 20px; border-radius: 10px; margin: 20px; text-align: center; font-size: 18px; border: 2px solid #ff4444;">${error.message || 'An unknown error occurred'}</div>`;
        errorDiv.style.display = 'block';
    }
}

async function fetchMatches(date, leagueId) {
    const season = getSeason(new Date(date));
    const response = await fetch(`https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=${season}&date=${date}`, {
        method: 'GET',
        headers: {
            'x-rapidapi-host': 'v3.football.api-sports.io',
            'x-rapidapi-key': API_FOOTBALL_KEY
        }
    });
    const data = await response.json();
    console.log(`Response for date ${date} and league ${leagueId}:`, data);
    return data;
}

function getSeason(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    return month >= 7 ? year : year - 1;
}

async function displayMatches(matches, title, date) {
    const matchesDiv = document.getElementById('matches');

    const sectionDiv = document.createElement('div');
    sectionDiv.className = 'match-section';
    sectionDiv.innerHTML = `<h2>Matches for ${title}</h2>`;

    if (matches.length === 0) {
        const noMatchesDiv = document.createElement('div');
        noMatchesDiv.className = 'no-matches';
        noMatchesDiv.textContent = `No matches scheduled for this day`;
        sectionDiv.appendChild(noMatchesDiv);
    } else {
        matches.sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date));

        for (const match of matches) {
            const matchDiv = document.createElement('div');
            matchDiv.className = 'match';
            matchDiv.setAttribute('data-fixture-id', match.fixture.id);

            const matchDate = new Date(match.fixture.date);
            const isFinished = match.fixture.status.short === 'FT';
            const isUpcoming = match.fixture.status.short === 'NS';

            // to fetch events if theyre not cached
            let events;
            if (apiCache.events[match.fixture.id]) {
                events = apiCache.events[match.fixture.id];
            } else {
                events = await fetchMatchEvents(match.fixture.id);
                apiCache.events[match.fixture.id] = events;
            }

            const goalScorers = getGoalScorers(events, match.teams.home.id, match.teams.away.id);

            // To fetch players if theyre not cached
            let playerStats;
            if (apiCache.players[match.fixture.id]) {
                playerStats = apiCache.players[match.fixture.id];
            } else {
                playerStats = await fetchPlayerStatistics(match.fixture.id);
                apiCache.players[match.fixture.id] = playerStats;
            }

            const motm = getManOfTheMatch(playerStats);

            matchDiv.innerHTML = `
            <div class="league-name">${match.leagueName}</div>
            <div class="scoreboard">
                <div class="team left">
                    <img src="${match.teams.home.logo}" alt="${match.teams.home.name} Logo" class="team-logo">
                    <p class="team-name">${match.teams.home.name}</p>
                    <ul class="goal-scorers">
                        ${goalScorers.home.map(scorer => `<li>⚽️ ${scorer}</li>`).join('')}
                    </ul>
                </div>
                <div class="score">
                    ${isFinished ? `${match.goals.home} - ${match.goals.away} <div class="finished">FT</div>` : isUpcoming ? matchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : `${match.goals.home ?? '-'} - ${match.goals.away ?? '-'}`}
                </div>
                <div class="team right">
                    <img src="${match.teams.away.logo}" alt="${match.teams.away.name} Logo" class="team-logo">
                    <p class="team-name">${match.teams.away.name}</p>
                    <ul class="goal-scorers">
                        ${goalScorers.away.map(scorer => `<li>⚽️ ${scorer}</li>`).join('')}
                    </ul>
                </div>
            </div>
            <div class="match-info">
                <span>${match.fixture.venue.name ?? 'N/A'}</span>
            </div>
            ${motm ? `<div class="motm">👑 MOTM: ${motm}</div>` : ''}
            `;

            matchDiv.addEventListener('click', () => toggleMatchDetails(match.fixture.id));
            sectionDiv.appendChild(matchDiv);
        }
    }

    matchesDiv.appendChild(sectionDiv);
}

function getGoalScorers(events, homeTeamId, awayTeamId) {
    const goalScorers = {
        home: {},
        away: {}
    };

    if (!events) return { home: [], away: [] };

    events.forEach(event => {
        if (event.type === 'Goal' && event.detail !== 'Own Goal') {
            const team = event.team.id === homeTeamId ? 'home' : 'away';
            const playerName = event.player.name || 'Unknown Player';

            if (!goalScorers[team][playerName]) {
                goalScorers[team][playerName] = [];
            }

            let timeString = `${event.time.elapsed}'`;
            if (event.time.extra) {
                timeString = `90+${event.time.extra}'`;
            }

            goalScorers[team][playerName].push(timeString);
        }
    });

    for (const team in goalScorers) {
        goalScorers[team] = Object.entries(goalScorers[team]).map(([name, times]) => {
            return `${name} ${times.join(", ")}`;
        });
    }

    return goalScorers;
}

function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateLabel(date) {
    const currentDate = new Date();
    const yesterday = new Date(currentDate);
    yesterday.setDate(currentDate.getDate() - 1);
    const tomorrow = new Date(currentDate);
    tomorrow.setDate(currentDate.getDate() + 1);

    if (date.toDateString() === currentDate.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    } else if (date.toDateString() === tomorrow.toDateString()) {
        return 'Tomorrow';
    } else {
        return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    }
}

async function fetchPlayerStatistics(fixtureId) {
    try {
        const response = await fetch(`https://v3.football.api-sports.io/fixtures/players?fixture=${fixtureId}`, {
            method: 'GET',
            headers: {
                'x-rapidapi-host': 'v3.football.api-sports.io',
                'x-rapidapi-key': API_FOOTBALL_KEY
            }
        });
        const data = await response.json();
        return data.response;
    } catch (error) {
        console.error('Error fetching player statistics:', error);
        return null;
    }
}

function getManOfTheMatch(playerStats) {
    if (!playerStats) return null;

    let bestPlayer = null;
    let highestScore = -1;

    playerStats.forEach(team => {
        team.players.forEach(player => {
            const score = calculatePlayerScore(player.statistics[0]);
            if (score > highestScore) {
                highestScore = score;
                bestPlayer = player.player.name;
            }
        });
    });

    return bestPlayer;
}

function calculatePlayerScore(stats) {
    return (stats.goals.total || 0) * 3 +
        (stats.passes.key || 0) * 1.5 +
        (stats.shots.on || 0) * 0.5 +
        (stats.tackles.total || 0) * 0.5 +
        (stats.dribbles.success || 0) * 0.5;
}

async function toggleMatchDetails(fixtureId) {
    const matchDiv = document.querySelector(`[data-fixture-id="${fixtureId}"]`);
    let detailsDiv = document.getElementById(`details-${fixtureId}`);
    if (!detailsDiv) {
        detailsDiv = document.createElement('div');
        detailsDiv.id = `details-${fixtureId}`;
        detailsDiv.className = 'match-details';
        matchDiv.appendChild(detailsDiv);
    }

    if (detailsDiv.style.display === 'block' && detailsDiv.innerHTML !== '<div class="loading">Loading match details... ⚽</div>') {
        detailsDiv.style.display = 'none';
        return;
    }

    // If empty or needs loading
    if (detailsDiv.innerHTML === '' || detailsDiv.innerHTML === '<div class="loading">Loading match details... ⚽</div>') {
        detailsDiv.innerHTML = '<div class="loading">Loading match details... ⚽</div>';
        detailsDiv.style.display = 'block';

        // to use the cached data from above code
        const events = apiCache.events[fixtureId] || await fetchMatchEvents(fixtureId);
        if (events && !apiCache.events[fixtureId]) apiCache.events[fixtureId] = events;

        const stats = apiCache.stats[fixtureId] || await fetchMatchStats(fixtureId);
        if (stats && !apiCache.stats[fixtureId]) apiCache.stats[fixtureId] = stats;

        const lineups = apiCache.lineups[fixtureId] || await fetchLineups(fixtureId);
        if (lineups && !apiCache.lineups[fixtureId]) apiCache.lineups[fixtureId] = lineups;

        detailsDiv.innerHTML = '';

        // Build the details content
        if (events) {
            displayMatchEvents(events, fixtureId);
        }
        if (stats) {
            displayMatchStats(stats, fixtureId);
        }
        if (lineups) {
            displayMatchLineups(lineups, fixtureId);
        }

        // Show if we have any content
        if (detailsDiv.innerHTML === '') {
            detailsDiv.innerHTML = '<div class="no-data">No detailed information available for this match 😔</div>';
        }
    } else {
        detailsDiv.style.display = 'block';
    }
}

async function fetchMatchStats(fixtureId) {
    try {
        const response = await fetch(`https://v3.football.api-sports.io/fixtures/statistics?fixture=${fixtureId}`, {
            method: 'GET',
            headers: {
                'x-rapidapi-host': 'v3.football.api-sports.io',
                'x-rapidapi-key': API_FOOTBALL_KEY
            }
        });
        const data = await response.json();
        console.log('API response for match statistics:', data);
        if (!data.response || data.response.length === 0) {
            throw new Error(`No statistics data found for fixture: ${fixtureId}`);
        }
        return data.response;
    } catch (error) {
        console.error('Error fetching match statistics:', error);
        return null;
    }
}

function displayMatchStats(stats, fixtureId) {
    const detailsDiv = document.getElementById(`details-${fixtureId}`);
    let statsHTML = '<div class="stats-box"><h3>Match Statistics</h3>';
    statsHTML += '<div class="stats-container">';

    stats[0].statistics.forEach((stat, index) => {
        const value1 = parseValue(stats[0].statistics[index].value);
        const value2 = parseValue(stats[1].statistics[index].value);

        if (value1 === null || value2 === null || isNaN(value1) || isNaN(value2)) {
            return;
        }

        const leftPercentage = calculatePercentage(value1, value2);
        const rightPercentage = calculatePercentage(value2, value1);

        const barDirection = leftPercentage > rightPercentage ? 'left' : 'right';

        statsHTML += `
            <div class="stat-row">
                <div class="stat-name">${stat.type}</div>
                <div class="stat-bar">
                    <div class="team-value left">${value1}</div>
                    <div class="bar-container">
                        <div class="bar ${barDirection}" style="width: ${Math.max(leftPercentage, rightPercentage)}%;"></div>
                    </div>
                    <div class="team-value right">${value2}</div>
                </div>
            </div>
        `;
    });

    statsHTML += '</div></div>';
    detailsDiv.innerHTML += statsHTML;
}

function parseValue(value) {
    return typeof value === 'string' ? parseFloat(value.replace('%', '')) : value;
}

function calculatePercentage(value1, value2) {
    const total = value1 + value2;
    return total === 0 ? 50 : (value1 / total) * 100;
}

async function fetchLineups(fixtureId) {
    try {
        const response = await fetch(`https://v3.football.api-sports.io/fixtures/lineups?fixture=${fixtureId}`, {
            method: 'GET',
            headers: {
                'x-rapidapi-host': 'v3.football.api-sports.io',
                'x-rapidapi-key': API_FOOTBALL_KEY
            }
        });
        const data = await response.json();
        console.log('API response for match lineups:', data);
        if (!data.response || data.response.length === 0) {
            throw new Error(`No lineups data found for fixture: ${fixtureId}`);
        }
        return data.response;
    } catch (error) {
        console.error('Error fetching lineups:', error);
        return null;
    }
}

function displayMatchLineups(lineups, fixtureId) {
    const detailsDiv = document.getElementById(`details-${fixtureId}`);
    let lineupsHTML = '<h3>Lineups</h3><div class="lineups-container">';

    lineups.forEach((team, index) => {
        const isHomeTeam = index === 0;
        lineupsHTML += `
            <div class="team-lineup ${isHomeTeam ? 'home' : 'away'}">
                <h4>${team.team.name}</h4>
                <p><strong>Formation:</strong> ${team.formation}</p>
                <div class="football-field">
                    ${createFieldPositions(team.startXI, isHomeTeam, team.formation)}
                </div>
                <h5>Substitutes:</h5>
                <ul class="substitutes-list">
                    ${team.substitutes.map(player => `<li>${player.player.number}. ${player.player.name} (${player.player.pos})</li>`).join('')}
                </ul>
            </div>
        `;
    });

    lineupsHTML += '</div>';
    detailsDiv.innerHTML += lineupsHTML;
}
//lineups formation 
function createFieldPositions(players, isHomeTeam, formation) {
    const formationParts = formation.split('-').map(Number);

    // to grp players by pos.
    const grouped = {
        G: [],
        D: [],
        M: [],
        F: []
    };

    players.forEach(player => {
        const pos = player.player.pos;
        if (grouped[pos]) {
            grouped[pos].push(player);
        }
    });

    let playersHTML = '';

    // goalkeeper position
    if (grouped.G.length > 0) {
        const gk = grouped.G[0];
        playersHTML += `
            <div class="player-container" style="top: 50%; left: ${isHomeTeam ? '8%' : '92%'};">
                <div class="player goalkeeper">GK</div>
                <div class="player-name">${gk.player.name}</div>
            </div>
        `;
    }

    // Ccalculation of horizontal positions based on formation
    const lines = formationParts.length;
    const fieldWidth = isHomeTeam ? 84 : 8; // End position for home/away
    const startPos = isHomeTeam ? 8 : 92;   // Start position (near goal)
    const direction = isHomeTeam ? 1 : -1;
    const spacing = Math.abs(fieldWidth - startPos) / (lines + 1);

    const linePositions = [];
    for (let i = 0; i < lines; i++) {
        linePositions.push(startPos + (spacing * (i + 1) * direction));
    }

    // Defenders position
    if (grouped.D.length > 0) {
        const leftPos = linePositions[0];
        const topStart = 10;
        const topEnd = 90;
        const step = (topEnd - topStart) / (grouped.D.length + 1);

        grouped.D.forEach((player, idx) => {
            playersHTML += `
                <div class="player-container" style="top: ${topStart + step * (idx + 1)}%; left: ${leftPos}%;">
                    <div class="player">D</div>
                    <div class="player-name">${player.player.name}</div>
                </div>
            `;
        });
    }

    // Midfielder positions(can be one or two lines)
    if (grouped.M.length > 0) {
        let mfLineIndices = [];

        // Determine if there is single or two lines of midfielders
        if (lines === 3) {
            mfLineIndices = [1]; // Single midfield line
        } else if (lines === 4) {
            // checking if we need to split midfielders into two lines
            if (grouped.M.length > 5) {
                mfLineIndices = [1, 2];
            } else {
                mfLineIndices = [1];
            }
        }

        const mfPerLine = Math.ceil(grouped.M.length / mfLineIndices.length);

        mfLineIndices.forEach((lineIdx, groupIdx) => {
            const leftPos = linePositions[lineIdx];
            const startIdx = groupIdx * mfPerLine;
            const endIdx = Math.min(startIdx + mfPerLine, grouped.M.length);
            const linePlayers = grouped.M.slice(startIdx, endIdx);

            const topStart = 10;
            const topEnd = 90;
            const step = (topEnd - topStart) / (linePlayers.length + 1);

            linePlayers.forEach((player, idx) => {
                playersHTML += `
                    <div class="player-container" style="top: ${topStart + step * (idx + 1)}%; left: ${leftPos}%;">
                        <div class="player">M</div>
                        <div class="player-name">${player.player.name}</div>
                    </div>
                `;
            });
        });
    }

    // Position forwards
    if (grouped.F.length > 0) {
        const leftPos = linePositions[linePositions.length - 1];
        const topStart = 10;
        const topEnd = 90;
        const step = (topEnd - topStart) / (grouped.F.length + 1);

        grouped.F.forEach((player, idx) => {
            playersHTML += `
                <div class="player-container" style="top: ${topStart + step * (idx + 1)}%; left: ${leftPos}%;">
                    <div class="player">F</div>
                    <div class="player-name">${player.player.name}</div>
                </div>
            `;
        });
    }

    return playersHTML;
}

async function fetchMatchEvents(fixtureId) {
    try {
        const response = await fetch(`https://v3.football.api-sports.io/fixtures/events?fixture=${fixtureId}`, {
            method: 'GET',
            headers: {
                'x-rapidapi-host': 'v3.football.api-sports.io',
                'x-rapidapi-key': API_FOOTBALL_KEY
            }
        });
        const data = await response.json();
        console.log('API response for match events:', data);
        if (!data.response || data.response.length === 0) {
            console.log(`No events data found for fixture: ${fixtureId}`);
            return null;
        }
        return data.response;
    } catch (error) {
        console.error('Error fetching match events:', error);
        return null;
    }
}

function displayMatchEvents(events, fixtureId) {
    const detailsDiv = document.getElementById(`details-${fixtureId}`);
    let eventsHTML = '<h3>Match Events</h3>';
    eventsHTML += '<div class="match-events">';

    events.forEach(event => {
        let eventIcon = '';
        let eventDetail = '';

        switch (event.type) {
            case 'Goal':
                eventIcon = '⚽';
                eventDetail = event.detail;
                break;
            case 'subst':
                eventIcon = '🔄';
                eventDetail = `${event.player.name} in, ${event.assist.name} out`;
                break;
            case 'Card':
                eventIcon = event.detail === 'Yellow Card' ? '🟨' : '🟥';
                eventDetail = `${event.player.name} - ${event.detail}`;
                break;
            default:
                eventIcon = '⚪';
                eventDetail = event.detail || event.type;
        }

        eventsHTML += `
            <div class="event ${event.type.toLowerCase()}">
                <span class="event-time">${event.time.elapsed}'</span>
                <span class="event-icon">${eventIcon}</span>
                <span class="event-team">${event.team.name}</span>
                <span class="event-details">${eventDetail}</span>
            </div>
        `;
    });

    eventsHTML += '</div>';
    detailsDiv.innerHTML += eventsHTML;
}
// Add this to your JavaScript file
const menuBtn = document.createElement('button');
menuBtn.className = 'mobile-menu-btn';
menuBtn.innerHTML = 'See Dates';
menuBtn.onclick = () => {
    const dateContainer = document.querySelector('.date-list-container');
    dateContainer.classList.toggle('active');
    menuBtn.classList.toggle('active');

    // Update button text based on menu state
    if (dateContainer.classList.contains('active')) {
        menuBtn.innerHTML = 'Close';
    } else {
        menuBtn.innerHTML = 'See Dates';
    }
};
document.body.appendChild(menuBtn);
document.addEventListener('DOMContentLoaded', createDateList);
