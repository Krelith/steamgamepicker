const express = require("express");
const { engine } = require('express-handlebars');
require("dotenv").config();

const app = express();

app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');

app.get('/', (req, res) => {
    res.render('home');
});

app.get('/api/resolve/:vanityUrl', async (req, res) => {
    const { vanityUrl } = req.params;

    if (!/^[a-zA-Z0-9_-]{2,32}$/.test(vanityUrl)) {
        return res.status(400).json({ error: 'Invalid username.' });
    }

    try {
        const response = await fetch(
            `http://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=${process.env.STEAMAPIKEY}&vanityurl=${encodeURIComponent(vanityUrl)}`
        );
        const data = await response.json();

        if (data.response.success !== 1) {
            return res.status(404).json({ error: 'Steam profile not found. Check your username and make sure your profile is public.' });
        }

        res.json({ steamId: data.response.steamid });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to resolve Steam username.' });
    }
});

app.get('/api/profile/:steamId', async (req, res) => {
    const { steamId } = req.params;

    if (!/^\d{17}$/.test(steamId)) {
        return res.status(400).json({ error: 'Invalid Steam ID.' });
    }

    try {
        const response = await fetch(
            `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${process.env.STEAMAPIKEY}&steamids=${steamId}`
        );
        const data = await response.json();
        const player = data.response?.players?.[0];

        if (!player) {
            return res.status(404).json({ error: 'Profile not found.' });
        }

        res.json({ name: player.personaname, avatar: player.avatarmedium });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch profile.' });
    }
});

app.get('/api/game/:appid', async (req, res) => {
    const { appid } = req.params;

    if (!/^\d+$/.test(appid)) {
        return res.status(400).json({ error: 'Invalid app ID.' });
    }

    try {
        const response = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appid}`);
        const data = await response.json();

        if (!data[appid] || !data[appid].success) {
            return res.status(404).json({ error: 'Game details not found.' });
        }

        const { name, short_description, header_image } = data[appid].data;
        res.json({ name, short_description, header_image });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch game details.' });
    }
});

app.get('/api/games/:steamId', async (req, res) => {
    const { steamId } = req.params;

    if (!/^\d{17}$/.test(steamId)) {
        return res.status(400).json({ error: 'Invalid Steam ID. It should be a 17-digit number.' });
    }

    try {
        const response = await fetch(
            `http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${process.env.STEAMAPIKEY}&steamid=${steamId}&include_appinfo=true&format=json`
        );
        const data = await response.json();

        if (!data.response || !data.response.games) {
            return res.status(404).json({ error: 'No games found. Make sure your Steam profile and game details are set to public.' });
        }

        res.json(data.response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch games from Steam.' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});
