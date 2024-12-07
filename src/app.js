import './assets/style.css'; 
import { generate as generateIFID } from './extwee/IFID/generate.js';
import { convertStoryToPlayable, convertMiroToHTMLStory, removeAllTags } from './utils.js';

/*async function addSticky() {
    const stickyNote = await miro.board.createStickyNote({
        content: 'Hello, World!', 
    }); 
    
    await miro.board.viewport.zoomTo(stickyNote); 
}*/

const delay = ms => new Promise(res => setTimeout(res, ms));

async function createStoryTemplate (btn)
{
    // Show loading
    if (!btn.classList.contains('button-loading'))
        btn.classList.add('button-loading');

    const width = 800;
    const height = 450;

    const left = -width / 2.0;
    const top = -height / 2.0;

    const padding = 10;
    const lineOffset = 5;

    const labelWidth = 200;
    const labelHeight = 14;

    
    const viewport = await miro.board.viewport.get();
    const x = viewport.x + viewport.width / 2.0;
    const y = viewport.y + viewport.height / 2.0;

    // Create frame
    const frame = await miro.board.createFrame({
        title: 'Twine Story',
        style: {
            fillColor: '#e6e6e6', // Default value: 'transparent' (no fill color)
        },
        x: x, // Default value: horizontal center of the board
        y: y, // Default value: vertical center of the board
        width: width,
        height: height,
    });

    // Create title
    const titleLabel = await miro.board.createText({
        content: '<p><i>Story Title</i></p>',
        style: {
            color: '#cfcfcf', // Default value: '#1a1a1a' (black)
            fillColor: 'transparent', // Default value: transparent (no fill)
            fillOpacity: 1, // Default value: 1 (solid color)
            fontFamily: 'roobert', // Default font type for the text
            fontSize: 14, // Default font size for the text
            textAlign: 'left', // Default horizontal alignment for the text
        },
        x: x + padding + left + labelWidth / 2.0, // Default value: horizontal center of the board
        y: y + padding + top + labelHeight / 2.0, // Default value: vertical center of the board
        width: labelWidth,
        rotation: 0.0,
        relativeTo: 'parent_top_left',
    });
    frame.add(titleLabel);
    
    const titleField = await miro.board.createShape({
        content: '<p><b>Untitled Story</b></p>',
        shape: 'round_rectangle',
        style: {
          fontFamily: 'arial',
          fontSize: 18,
          textAlign: 'left',
          textAlignVertical: 'middle',
          borderStyle: 'normal',
          borderOpacity: 0.1,
          borderColor: '#000000',
          borderWidth: 1,
          fillOpacity: 1.0,
        },
        x: x + padding + left + labelWidth / 2.0 + 1,
        y: y + padding + top + labelHeight / 2.0 + 22,
        width: labelWidth,
        height: 25,
        relativeTo: 'parent_top_left',
    });
    frame.add(titleField);
    await titleField.setMetadata('twine-data', {
        type: 'title-field',
    });
    await titleField.sync();

    // IFID
    const ifidLabel = await miro.board.createText({
        content: `<p>${generateIFID()}</p>`,
        style: {
            color: '#cfcfcf', // Default value: '#1a1a1a' (black)
            fillColor: 'transparent', // Default value: transparent (no fill)
            fillOpacity: 1, // Default value: 1 (solid color)
            fontFamily: 'plex_mono', // Default font type for the text
            fontSize: 10, // Default font size for the text
            textAlign: 'left', // Default horizontal alignment for the text
        },
        x: x + padding + left + 250 / 2.0, // Default value: horizontal center of the board
        y: y + padding + top + labelHeight / 2.0 + 42, // Default value: vertical center of the board
        width: 250,
        rotation: 0.0,
        relativeTo: 'parent_top_left',
    });
    frame.add(ifidLabel);
    await ifidLabel.setMetadata('twine-data', {
        type: 'ifid-field',
    });
    await ifidLabel.sync();

    // Create story data
    // start node
    const startNode = await miro.board.createShape({
        content: '<p><b>START</b></p>',
        shape: 'circle',
        style: {
          fontFamily: 'roboto-mono',
          fontSize: 14,
          color: '#414bb2',
          borderStyle: 'normal',
          borderOpacity: 1.0,
          borderColor: '#414bb2',
          borderWidth: 2,
          fillOpacity: 0.5,
          fillColor: '#414bb2',
        },
        x: x,
        y: y + padding + top + labelHeight / 2.0 + 22,
        width: 65,
        height: 35,
    });
    frame.add(startNode);
    await startNode.setMetadata('twine-data', {
        type: 'start-node',
    });
    await startNode.sync();

    // Create base passage
    const basePassage = await miro.board.createCard({
        title: 'My First Passage',
        description: 'Lorem ipsum dolor sit amet...',
        style: {
            cardTheme: '#414bb2',
            fillBackground: true,
        },
        x: x,
        y: y + padding + top + labelHeight / 2.0 + 120,  
        width: 200,
    });
    frame.add(basePassage);

    // Create template passage
    const templatePassage = await miro.board.createCard({
        title: 'Template Passage to Copy/Paste',
        description: 'Lorem ipsum dolor sit amet...',
        style: {
            cardTheme: '#414bb2',
            fillBackground: true,
        },
        x: x + padding + left + 100,
        y: y + padding + top + 100,  
        width: 200,
    });
    frame.add(templatePassage);

    // Connect
    const connector = await miro.board.createConnector({
        shape: 'curved',
        style: {
          endStrokeCap: 'rounded_stealth',
          strokeStyle: 'normal',
          strokeColor: '#414bb2',
          strokeWidth: 2,
        },
        start: {
          item: startNode.id,
        },
        end: {
          item: basePassage.id,
        },
    });      
    
    // Zoom to it
    await miro.board.viewport.zoomTo(frame); 
    
    // Display the notification on the board UI.
    await miro.board.notifications.showInfo(`New Twine Template has been created!`);

    // Remove loading
    btn.classList.remove('button-loading');
}

async function downloadStoryHTML(btn, listSelect) {
    if (!btn.classList.contains('button-loading'))
        btn.classList.add('button-loading');

    try {
        // Create the compiled story
        const htmlCompiledStory = await convertMiroToHTMLStory(listSelect, null);
        if (htmlCompiledStory == null)
        {
            await miro.board.notifications.showError(`Could not convert board to a story!`);
            return;
        }
        
        // Create a Blob with the HTML content
        const blob = new Blob([htmlCompiledStory], { type: 'text/html' });
        
        // Create a temporary anchor element
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'MiroGeneratedTwineStory.html'; // The file name to save

        // Trigger the download
        a.click();

        // Clean up the Object URL
        URL.revokeObjectURL(a.href);
    
        // Display the notification on the board UI.
        await miro.board.notifications.showInfo(`Twine story downloaded!`);

    } catch (error) {
        console.error('Error:', error);
        await miro.board.notifications.showError(`Error while generating the story...`);
    }

    // Remove loading
    btn.classList.remove('button-loading');
}

async function refreshList (btn, listSelect, btns)
{
    // Show loading
    if (!btn.classList.contains('button-loading'))
        btn.classList.add('button-loading');
    btn.innerHTML = '';

    // Get all the frames
    const frames = await miro.board.get({
        type: ['frame'],
    });

    let stories = [];
    for (let i = 0; i < frames.length; ++i) {
        if (frames[i].title == 'Twine Story') {
            for (let j = 0; j < frames[i].childrenIds.length; ++j)
            {
                const child = await miro.board.getById(frames[i].childrenIds[j]);
                const metadata = await child.getMetadata('twine-data');
                if (metadata != null && metadata.type == 'title-field')
                {
                    stories.push([ frames[i].id, removeAllTags(child.content) ]);
                }
            }
        }
    }

    // Update list
    listSelect.disabled = stories.length <= 0;
    if (stories.length <= 0) {
        listSelect.innerHTML = 'Empty';
    } else {
        let html = '';
        for (let i = 0; i < stories.length; ++i) {
            html += `<option value="${stories[i][0]}">${stories[i][1]}</option>`;
        }
        listSelect.innerHTML = html;
    }

    // Update buttons
    for (let i = 0; i < btns.length; ++i) {
        if (stories.length > 0)
            btns[i].removeAttribute('disabled');
        else
            btns[i].addAttribute('disabled');
    }

    // Remove loading
    btn.classList.remove('button-loading');
    btn.innerHTML = '<span class="icon icon-refresh"></span>';
}

const listSelect = document.getElementById('select');

const createStoryTemplateBtn = document.getElementById('create_story_template');
createStoryTemplateBtn.addEventListener('click', (event) => {
    createStoryTemplate(createStoryTemplateBtn);
});

/*const displayModalBtn = document.getElementById('display_modal');
displayModalBtn.addEventListener('click', (event) => {
    convertStoryToPlayable(displayModalBtn, true, listSelect, null);
});*/

const displayFullscreenBtn = document.getElementById('display_fullscreen');
displayFullscreenBtn.addEventListener('click', (event) => {
    convertStoryToPlayable(displayFullscreenBtn, false, listSelect, null);
});

const downloadBtn = document.getElementById('download');
downloadBtn.addEventListener('click', (event) => {
    downloadStoryHTML(downloadBtn, listSelect);
});

const refreshListBtn = document.getElementById('refresh_list');
refreshListBtn.addEventListener('click', (event) => {
    refreshList(refreshListBtn, listSelect, [/*displayModalBtn, */displayFullscreenBtn, downloadBtn]);
});