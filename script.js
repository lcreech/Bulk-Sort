// Replace with your Spotify API credentials
const clientId = "e93b71750ffb4423b2e14bec453f5b1b"; 
const redirectUri = "https://bulksort.netlify.app/"; // Update for Netlify deployment
let accessToken = "";

// Spotify Authorization URL
const authUrl = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=playlist-read-private playlist-modify-private playlist-modify-public`;

// Redirect to Spotify Login
function loginToSpotify() {
    window.location.href = authUrl;
}

// Get Access Token from URL
function getAccessTokenFromUrl() {
    const hash = window.location.hash;
    if (hash) {
        const params = new URLSearchParams(hash.substring(1));
        accessToken = params.get("access_token");
        window.history.pushState("", document.title, window.location.pathname); // Clean the URL
        return accessToken;
    }
    return null;
}

// Fetch Playlist Tracks
async function fetchPlaylistTracks(playlistId) {
    const url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        throw new Error("Failed to fetch playlist tracks");
    }

    const data = await response.json();
    return data.items;
}

// Create New Playlist
async function createPlaylist(userId, playlistName) {
    const url = `https://api.spotify.com/v1/users/${userId}/playlists`;
    const response = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            name: playlistName,
            public: false,
        }),
    });

    if (!response.ok) {
        throw new Error("Failed to create playlist");
    }

    const data = await response.json();
    return data.id;
}

// Add Tracks to Playlist
async function addTracksToPlaylist(playlistId, trackUris) {
    const url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;
    const response = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            uris: trackUris,
        }),
    });

    if (!response.ok) {
        throw new Error("Failed to add tracks to playlist");
    }
}

// Main Logic for Sorting by Month
async function sortPlaylistByMonth(playlistId) {
    try {
        const tracks = await fetchPlaylistTracks(playlistId);
        const monthlyBuckets = {};

        // Categorize tracks by month
        tracks.forEach((item) => {
            const addedDate = new Date(item.added_at);
            const monthKey = `${addedDate.getFullYear()}-${String(addedDate.getMonth() + 1).padStart(2, "0")}`;
            if (!monthlyBuckets[monthKey]) {
                monthlyBuckets[monthKey] = [];
            }
            monthlyBuckets[monthKey].push(item.track.uri);
        });

        // Create playlists for each month and add tracks
        const userId = await getCurrentUserId();
        for (const [month, uris] of Object.entries(monthlyBuckets)) {
            const playlistName = `2024-${month}`;
            const newPlaylistId = await createPlaylist(userId, playlistName);
            await addTracksToPlaylist(newPlaylistId, uris);
        }

        alert("Playlists created successfully!");
    } catch (error) {
        console.error(error);
        alert("An error occurred while sorting the playlist.");
    }
}

// Get Current User ID
async function getCurrentUserId() {
    const url = "https://api.spotify.com/v1/me";
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        throw new Error("Failed to fetch user ID");
    }

    const data = await response.json();
    return data.id;
}

// DOM Events
window.onload = () => {
    if (!getAccessTokenFromUrl()) {
        document.getElementById("auth-button").addEventListener("click", loginToSpotify);
    } else {
        document.getElementById("auth-section").classList.add("hidden");
        document.getElementById("playlist-section").classList.remove("hidden");
        document.getElementById("create-playlist").addEventListener("click", () => {
            const playlistId = prompt("Enter the 'To Sort' playlist ID:");
            if (playlistId) {
                sortPlaylistByMonth(playlistId);
            }
        });
    }
};
