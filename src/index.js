import { convertStoryToPlayable } from './utils.js';

export async function init() {
    await miro.board.ui.on('custom:twine-test', async function (data) {
        if (data.items.length <= 0 && data.items.length >= 2) {
            await miro.board.notifications.showError(`Invalid selection!`);
            return;
        }
        await miro.board.notifications.showInfo(`Please wait for the story to compile...`);
        
        const firstCard = data.items[0];
        convertStoryToPlayable(null, true, null, firstCard);
    });
    await miro.board.experimental.action.register(
    {
        "event": "twine-test",
        "ui": {
        "label": {
            "en": "Twine: Test from Here",
        },
        "icon": "presentation-play",
        "description": "Use this card as the starting card to test the story.",   
        },
        "scope": "local",
        "predicate": {
            "$or": [
                { type: "card" },
            ]
        },
        "selection": 'single',
        "contexts": {
            "item": {}
        }
    });

    miro.board.ui.on('icon:click', async () => {
        await miro.board.ui.openPanel({ url: 'app.html' }); 
    }); 
} 

init(); 
