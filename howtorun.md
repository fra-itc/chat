# Istruzioni per l'Installazione e l'Avvio

## Requisiti
- Node.js (versione 16 o superiore)
- npm (normalmente installato con Node.js)

## Installazione delle Dipendenze

Per installare tutte le dipendenze necessarie, esegui il seguente comando nella directory principale del progetto:

```bash
npm install
```

Questo comando installerà tutte le dipendenze elencate nel file `package.json`, tra cui:
- React e React DOM
- TypeScript
- Vite (bundler e server di sviluppo)
- Axios (per le richieste HTTP)
- Zustand (per la gestione dello stato)
- Tailwind CSS (per lo styling)
- Lucide React (per le icone)
- React Markdown (per il rendering dei messaggi in markdown)
- React Hot Toast (per le notifiche)

## Avvio dell'Applicazione

Dopo aver installato le dipendenze, puoi avviare l'applicazione in modalità sviluppo con il seguente comando:

```bash
npm run dev
```

Questo comando avvierà il server di sviluppo Vite. Una volta avviato, potrai accedere all'applicazione tramite il browser all'indirizzo mostrato nel terminale (solitamente http://localhost:5173/).

## Configurazione dell'Applicazione

Al primo avvio, dovrai configurare l'applicazione con:
1. La tua API Key di OpenAI
2. L'ID dell'assistente che desideri utilizzare
3. Opzionalmente, l'ID del vector store se utilizzi embedding personalizzati

Queste informazioni possono essere inserite nel pannello di configurazione dell'applicazione.

## Compilazione per la Produzione

Quando sei pronto per distribuire l'applicazione in produzione, puoi creare una build ottimizzata con:

```bash
npm run build
```

Questo comando genererà i file ottimizzati nella directory `dist`, che potranno essere serviti da qualsiasi web server statico.

Per visualizzare in anteprima la build di produzione localmente:

```bash
npm run preview
```
