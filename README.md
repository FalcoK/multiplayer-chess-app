# Multiplayer Schach-Arena 👑

Eine moderne, vollständig funktionstüchtige Multiplayer-Schach-Web-App mit ELO-System, Echtzeit-Spielen, integriertem Chat, Turniermodus (Liga & K.-o.) und anpassbaren Schachbrett-Designs. 

Die App ist **100% lokal lauffähig** und benötigt **keine externen Bezahldienste**.

## Features

1. **Benutzer & Einladungen:**
   - Registrierung & Login mit verschlüsselten Passwörtern (`bcryptjs`).
   - Schneller **Gastmodus** ohne Passwort zur sofortigen Teilnahme.
   - Generierung von Einladungslinks (`http://localhost:5173/#game:<id>`), über die ein zweiter Spieler direkt beitreten kann.
   - Wahlweise öffentliche oder private Spiele.

2. **Vollständiges Schachregelwerk (via `chess.js` & Custom Board):**
   - Legale Züge, Schach, Schachmatt, Patt (Stalemate), unzureichendes Material, dreifache Stellungswiederholung.
   - Spezialzüge: Rochade, En Passant und Bauernumwandlung (mit Auswahlfeld).
   - Zughistorie (PGN-Notation).
   - **Zug-Rücknahmen** (müssen vom Gegner über ein Popup bestätigt werden).
   - Aufgabe und Remis-Angebote während des Spiels.

3. **ELO-Wertungssystem:**
   - Start-ELO: 1200.
   - Automatische ELO-Berechnung nach Beendigung von gewerteten Spielen (Formel mit K-Faktor = 32).
   - Ausführliche ELO-Statistiken (Höchste ELO, Gewinnrate) im Spielerprofil.

4. **Turniermodus:**
   - Erstellung von Ligen (Jeder gegen jeden / Round Robin) oder K.-o.-Turnieren (Knockout).
   - Automatische Generierung der Paarungen und Rundenfortschritte in Echtzeit.
   - Übersichtliche Turniertabelle und KO-Brackets mit Verlinkung zu den Live-Matches.

5. **Aesthetisches Responsive Design:**
   - Edles Dark Theme mit Neon-Glow und Glassmorphismus-Effekten.
   - **4 wählbare Brett-Designs**: Klassisch Holz, Modern Hell/Dunkel, Grün/Weiß, Blau/Grau.
   - Vollständig responsive Layouts für ein optimales Spielerlebnis auf Desktop und Smartphone.
   - Keine externen Bild-Assets: Alle Schachfiguren sind als performante Inline-SVGs integriert.

---

## Technische Struktur

- **Frontend:** React + Vite, Socket.io-Client, CSS Custom Properties (Vanilla CSS).
- **Backend:** Node.js, Express, Socket.io für Realtime-Gameplay, SQLite (`sqlite3`) für lokale Datenhaltung, JWT für Sitzungen.

---

## Lokaler Schnellstart

### 1. Installation aller Abhängigkeiten
Führe im Hauptverzeichnis des Projekts den folgenden Befehl aus, um alle Abhängigkeiten im Root, `/backend` und `/frontend` automatisch zu installieren:

```bash
npm run install-all
```

### 2. Starten der App im Entwicklungsmodus
Starte Backend-Server (Port 3001) und Frontend-Client (Port 5173) parallel mit:

```bash
npm run dev
```

Die Web-App öffnet sich unter: **[http://localhost:5173](http://localhost:5173)**.

---

## Spielen im lokalen Netzwerk (Heimnetzwerk)

Die App löst die WebSocket-Verbindung dynamisch über die IP-Adresse Ihres Host-PCs auf. Sie können auf Ihrem PC ein Spiel erstellen, den Einladungslink kopieren und ihn z. B. auf Ihr Smartphone senden. Solange beide Geräte im selben WLAN sind, können Sie nahtlos gegeneinander spielen!

*Beispiel-Link für Mobilgeräte:* `http://<DEINE_PC_IP>:5173/#game:<id>`
