import './assets/style.css'; 
import { parse as parseTwee } from './extwee/Twee/parse.js'
import { parse as parseJson } from './extwee/JSON/parse.js'
import { parse as parseTwine1HTML } from './extwee/Twine1HTML/parse.js'
import { parse as parseTwineArchive2HTML } from './extwee/Twine2ArchiveHTML/parse.js'
import { parse as parseTwine2HTML } from './extwee/Twine2HTML/parse.js'
import { generate as generateIFID } from './extwee/IFID/generate.js';
import { convertStoryToPlayable, convertMiroToHTMLStory, removeAllTags, storyFormats } from './utils.js';
import Passage from './extwee/Passage.js';
import { Story } from './extwee/Story.js';

// Convert a Twine Passage text into a card description
// Basically this adds <p></p> to each line.
// Return: string
function convertPassageTextToCardDescription (passageText) {
    let lines = passageText.split('\n');
    let cardDescription = '';
    for (let i = 0; i < lines.length; ++i) {
        let line = lines[i];
        line = line.replace('<', '&lt;');
        line = line.replace('>', '&gt;');
        cardDescription += `<p>${line}<\/p>\n`;
    }
    return cardDescription;
} 

// Test include a whole word.
// Return: bool
function includesWholeWord(str, word) {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    return regex.test(str);
}

// Test include a passage name word.
// Return: bool
function includesPassageName(str, word) {
    return includesWholeWord(str, word) &&
           (str.includes(`[[${word}]]`) ||
            str.includes(`[[${word}`) ||
            str.includes(`${word}]]`) ||
            str.includes(`'${word}'`) ||
            str.includes(`"${word}"`) ||
            str.includes(`\`${word}\``));
}

// Create a hierarchical tree layout for the passages so that
// it's nice and readable.
// Could probably be improved, this is just raw ChatGPT...
// Return: Array of nodes
function hierarchicalLayout(nodes, edges) {
    const nodeWidth = 220;
    const levelHeight = 100;

    // Assign levels to nodes
    nodes.forEach(node => {
        edges.forEach(edge => {
            if (edge.source === node.id) {
                const targetNode = nodes.find(n => n.id === edge.target);
                targetNode.level = Math.max(targetNode.level, node.level + 1);
            }
        });
    });

    // Group nodes by level
    const levels = {};
    nodes.forEach(node => {
        if (!levels[node.level]) levels[node.level] = [];
        levels[node.level].push(node);
    });

    // Position nodes within each level
    Object.keys(levels).forEach(level => {
        const levelNodes = levels[level];
        const startX = (levelNodes.length * nodeWidth) / 2.0;
        levelNodes.forEach((node, index) => {
        node.x = index * nodeWidth - startX;
        node.y = level * levelHeight;
        });
    });

    return nodes;
}  

// Create a Miro Story from a Twine Story 
// Return: Frame (Miro Element)
async function createStoryLayout (story) {
    // Create the hierarchical layout
    let nodes = [];
    let edges = [];

    // Add the start node
    nodes.push({
        'passage': null,
        'miroElement': null,
        'x': 0.0,
        'y': 0.0,
        'level': 0,
        'id': 0
    });

    // Add the start node connection to the edge list
    for (let i = 0; i < story.passages.length; ++i) {
        if (story.passages[i].name == story.start) {
            edges.push({ source: 0, target: i + 1 });
            break;
        }
    }

    // Add passages to nodes along with their connections to the edge list
    for (let i = 0; i < story.passages.length; ++i) {
        nodes.push({
            'passage': story.passages[i],
            'miroElement': null,
            'x': 0.0,
            'y': 0.0,
            'level': 0,
            'id': i + 1
        });

        // create connections
        for (let j = 0; j < story.passages.length; ++j) {
            if (includesPassageName(story.passages[i].text, story.passages[j].name)) {
                edges.push({ source: i + 1, target: j + 1 });
            }
        }
    }

    // Do the hierarchical layout
    hierarchicalLayout(nodes, edges);

    // Find out the width/height of the frame to encapsulate the nodes
    let width = 800;
    let height = 450;
    let minX = nodes[0].x - 110;
    let maxX = nodes[0].x + 110;
    let maxY = nodes[0].y;
    for (let i = 1; i < nodes.length; ++i) {
        minX = Math.min(minX, nodes[i].x - 110);
        maxX = Math.max(maxX, nodes[i].x + 110);
        maxY = Math.max(maxY, nodes[i].y);
    }
    maxY += 100;
    width = Math.max(width, maxX - minX);
    height = Math.max(height, maxY);

    // Cache some offsets
    const left = -width / 2.0;
    const top = -height / 2.0;

    const padding = 10;

    const labelWidth = 200;
    const labelHeight = 14;
    
    const viewport = await miro.board.viewport.get();
    const x = viewport.x + viewport.width / 2.0;
    const y = viewport.y + viewport.height / 2.0;

    // Create frame (the name is important, it's how we find the stories)
    const frame = await miro.board.createFrame({
        title: 'Twine Story',
        style: {
            fillColor: '#e6e6e6',
        },
        x: x,
        y: y,
        width: width,
        height: height,
    });

    // Create title element
    const titleLabel = await miro.board.createText({
        content: '<p><i>Story Title</i></p>',
        style: {
            color: '#cfcfcf',
            fillColor: 'transparent',
            fillOpacity: 1,
            fontFamily: 'roobert',
            fontSize: 14,
            textAlign: 'left',
        },
        x: x + padding + left + labelWidth / 2.0,
        y: y + padding + top + labelHeight / 2.0,
        width: labelWidth,
        rotation: 0.0,
        relativeTo: 'parent_top_left',
    });
    frame.add(titleLabel);
    
    // Create title field element
    const titleField = await miro.board.createShape({
        content: `<p><b>${story.name}</b></p>`,
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

    // Create story format title element
    const formatLabel = await miro.board.createText({
        content: '<p><i>Story Format</i></p>',
        style: {
            color: '#cfcfcf', 
            fillColor: 'transparent', 
            fillOpacity: 1, 
            fontFamily: 'roobert', 
            fontSize: 10, 
            textAlign: 'left', 
        },
        x: x + padding + left + labelWidth / 2.0,
        y: y + padding + top + labelHeight / 2.0 + 45,
        width: labelWidth,
        rotation: 0.0,
        relativeTo: 'parent_top_left',
    });
    frame.add(formatLabel);
    
    // Fix story format in case it's missing the format version
    let formatVersion = story.formatVersion;
    if (formatVersion == '' || formatVersion == null) {
        for (let i = 0; i < storyFormats.length; ++i) {
            if (storyFormats[i].includes(story.format)) {
                formatVersion = storyFormats[0].title.split('-')[1];
                break;
            }
        }
    }

    // Create story format field element
    const formatField = await miro.board.createShape({
        content: `<p><b>${story.format}-${story.formatVersion}</b></p>`,
        shape: 'round_rectangle',
        style: {
          fontFamily: 'arial',
          fontSize: 14,
          textAlign: 'left',
          textAlignVertical: 'middle',
          borderStyle: 'normal',
          borderOpacity: 0.1,
          borderColor: '#000000',
          borderWidth: 1,
          fillOpacity: 1.0,
        },
        x: x + padding + left + labelWidth / 2.0 + 1,
        y: y + padding + top + labelHeight / 2.0 + 62,
        width: labelWidth,
        height: 20,
        relativeTo: 'parent_top_left',
    });
    frame.add(formatField);
    await formatField.setMetadata('twine-data', {
        type: 'format-field',
    });
    await formatField.sync();

    // IFID title
    const ifidTitle = await miro.board.createText({
        content: `<p><i>IFID (do not edit)</i></p>`,
        style: {
            color: '#cfcfcf', 
            fillColor: 'transparent', 
            fillOpacity: 1, 
            fontFamily: 'arial', 
            fontSize: 10, 
            textAlign: 'left', 
        },
        x: x + padding + left + 250 / 2.0,
        y: y + padding + top + labelHeight / 2.0 + 84,
        width: 250,
        rotation: 0.0,
        relativeTo: 'parent_top_left',
    });
    frame.add(ifidTitle);

    // IFID label
    const ifidLabel = await miro.board.createText({
        content: `<p>${story.IFID}</p>`,
        style: {
            color: '#cfcfcf', 
            fillColor: 'transparent', 
            fillOpacity: 1, 
            fontFamily: 'plex_mono', 
            fontSize: 10, 
            textAlign: 'left', 
        },
        x: x + padding + left + 250 / 2.0,
        y: y + padding + top + labelHeight / 2.0 + 97,
        width: 250,
        rotation: 0.0,
        relativeTo: 'parent_top_left',
    });
    frame.add(ifidLabel);
    await ifidLabel.setMetadata('twine-data', {
        type: 'ifid-field',
    });
    await ifidLabel.sync();

    // Start node element
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
        x: x + nodes[0].x + 110,
        y: y + padding + top + nodes[0].y + labelHeight / 2.0 + 22,
        width: 65,
        height: 35,
    });
    frame.add(startNode);
    await startNode.setMetadata('twine-data', {
        type: 'start-node',
    });
    await startNode.sync();
    nodes[0].miroElement = startNode;

    // Get or create tags
    let currentTags = [];
    let boardTags = await miro.board.get({ type: 'tag' });
    for (let i = 0; i < story.passages.length; ++i) {
        for (let j = 0; j < story.passages[i].tags.length; ++j) {
            // Try to get
            let id = null;
            for (let k = 0; k < boardTags.length; ++k) {
                // found
                if (boardTags[k].title == story.passages[i].tags[j]) {
                    id = boardTags[k].id;
                    break;
                }
            }
            // Not found, create
            if (id == null) {
                const tag = await miro.board.createTag({ title: story.passages[i].tags[j], });
                boardTags.push(tag);
                id = tag.id;
            }
            // Record name and id
            currentTags.push([ story.passages[i].tags[j], id]);
        }
    }

    // Create passage cards
    for (let i = 1; i < nodes.length; ++i) {
        // Get passage's tag IDs
        let tagIds = [];
        for (let j = 0; j < nodes[i].passage.tags.length; ++j) {
            for (let k = 0; k < currentTags.length; ++k) {
                if (currentTags[k][0] == nodes[i].passage.tags[j]) {
                    tagIds.push(currentTags[k][1]);
                    break;
                }
            }
        }
        // Create card
        nodes[i].miroElement = await miro.board.createCard({
            title: nodes[i].passage.name,
            description: convertPassageTextToCardDescription(nodes[i].passage.text),
            style: {
                cardTheme: '#414bb2',
                fillBackground: true,
            },
            x: x + nodes[i].x + 110,
            y: y + top + nodes[i].y + labelHeight / 2.0 + 45,  
            width: 200,
            tagIds: tagIds,
        });
        // Set card's parent
        frame.add(nodes[i].miroElement);
    }

    // Create passage connections
    for (let i = 0; i < edges.length; ++i) {
        const connector = await miro.board.createConnector({
            shape: 'curved',
            style: {
              endStrokeCap: 'rounded_stealth',
              strokeStyle: 'normal',
              strokeColor: '#414bb2',
              strokeWidth: 2,
            },
            start: {
              item: nodes[edges[i].source].miroElement.id,
            },
            end: {
              item: nodes[edges[i].target].miroElement.id,
            },
        });      
    }

    // Return
    return frame;
}

// Create a new story from a template
async function createStoryTemplate (btn)
{
    // Show loading
    if (!btn.classList.contains('button-loading'))
        btn.classList.add('button-loading');

    // Create the default story
    let story = new Story();
    story.IFID = generateIFID();
    let format = storyFormats[0].title.split('-');
    story.format = format[0];
    story.formatVersion = format[1];

    story.start = 'First Passage';
    story.passages = [
        new Passage('First Passage', 'Lorem ipsum dolor sit amet...'),
    ];

    // Generate the layout
    const frame = await createStoryLayout(story);

    if (frame == null) {
        throw new Error('Error while creating the layout for the story!');
    }

    // Create template passage
    const templatePassage = await createTemplatePassage(storyFormats[0], frame.x - frame.width / 2.0 + 110, frame.y - frame.height / 2.0 + 160);
    frame.add(templatePassage);

    // Zoom to it
    await miro.board.viewport.zoomTo(frame); 
    
    // Display the notification on the board UI.
    await miro.board.notifications.showInfo(`New Twine Template has been created!`);

    // Remove loading
    btn.classList.remove('button-loading');
}

// Downloads the selected Twine Story as a HTML file
async function downloadStoryHTML(btn, listSelect) {
    // Loading
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
        let blob = new Blob([htmlCompiledStory], { type: 'text/html' });
        
        // Create a temporary anchor element
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'MiroGeneratedTwineStory.html'; // The file name to save

        // Trigger the download
        a.click();

        // Clean up the Object URL
        URL.revokeObjectURL(a.href);
        blob = null;
    
        // Display the notification on the board UI.
        await miro.board.notifications.showInfo(`Twine story downloaded!`);

    } catch (error) {
        console.error('Error:', error);
        await miro.board.notifications.showError(`Error while generating the story...`);
    }

    // Remove loading
    btn.classList.remove('button-loading');
}

// Refresh the list of twine stories in the Miro Board.
// This is used to generate Twine Stories from Miro Stories.
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

    // Look for frame stories in all the frames
    let stories = [];
    for (let i = 0; i < frames.length; ++i) {
        if (frames[i].title == 'Twine Story') {
            for (let j = 0; j < frames[i].childrenIds.length; ++j)
            {
                const child = await miro.board.getById(frames[i].childrenIds[j]);
                const metadata = await child.getMetadata('twine-data');
                if (metadata != null && metadata.type == 'title-field')
                {
                    // We save the frame ID and the story title to display it
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

    // Update buttons interactability
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

// Imports a Twine Story from a local JSON, HTML, or TWEE file.
// The file is imported and then a new layout is generated.
async function importStory (file, btn) {
    // Show loading
    if (!btn.classList.contains('button-loading'))
        btn.classList.add('button-loading');

    try {
        // Early-out
        if (!file) {
            throw new Error('No file was selected!');
        }

        // Import the file
        const fileContents = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(new Error('Error reading file'));
            reader.readAsText(file); // Read the file as text
        });

        const extension = file.name.substring(file.name.lastIndexOf('.') + 1);

        // Parse the file
        let story = null;
        if (extension == 'twee') {
            story = parseTwee(fileContents);
        } else if (extension == 'json') {
            story = parseJson(fileContents);
        } else if (extension == 'html') {
            try {
                story = parseTwine2HTML(fileContents);
            } catch (error) {
                try {
                    story = parseTwineArchive2HTML(fileContents);
                } catch (error) {
                    story = parseTwine1HTML(fileContents);
                }
            }
        } else {
            throw new Error('Invalid file extension! Supported extensions are JSON, HTML and TWEE.');
        }

        // Story not imported
        if (story == null) {
            throw new Error('Error while importing the story!');
        }

        // Create the story
        const frame = await createStoryLayout(story);

        if (frame == null) {
            throw new Error('Error while creating the layout for the story!');
        }
    
        // Zoom to it
        await miro.board.viewport.zoomTo(frame); 
        
        // Display the notification on the board UI.
        await miro.board.notifications.showInfo(`Twine story has been imported successfully!`);
    } catch (error) {
        console.error('Error:', error);
        await miro.board.notifications.showError(error);
    }

    // Remove loading
    btn.classList.remove('button-loading');
}

// Create a Template Passage from the story format templates.
// Return: Card (Miro Element)
async function createTemplatePassage (storyFormat, x, y) {
    const templatePassage = await miro.board.createCard({
        title: `Template Passage to Copy/Paste for ${storyFormat.title} story format`,
        description: convertPassageTextToCardDescription(storyFormat.template),
        style: {
            cardTheme: '#414bb2',
            fillBackground: true,
        },
        x: x,
        y: y,  
        width: 200,
    });
    return templatePassage;
}

// Create a template passage from a specific story format
window.createTemplatePassageFromId = async function(id) {
    const viewport = await miro.board.viewport.get();
    const x = viewport.x + viewport.width / 2.0;
    const y = viewport.y + viewport.height / 2.0;

    const templatePassage = await createTemplatePassage(storyFormats[id], x, y);
    
    // Zoom to it
    await miro.board.viewport.zoomTo(templatePassage); 
    
    // Display the notification on the board UI.
    await miro.board.notifications.showInfo(`New Template Passage using the ${storyFormats[id].title} story format has been created!`);
};

// Create template
const createStoryTemplateBtn = document.getElementById('create_story_template');
createStoryTemplateBtn.addEventListener('click', (event) => {
    createStoryTemplate(createStoryTemplateBtn);
});

// Import
const fileInput = document.getElementById('fileInput');
const importStoryBtn = document.getElementById('import_story');
importStoryBtn.addEventListener('click', (event) => {
    fileInput.click();
});

fileInput.addEventListener('change', (event) => {
    importStory(event.target.files[0], importStoryBtn);
});

// Export
const listSelect = document.getElementById('select');
const displayFullscreenBtn = document.getElementById('display_fullscreen');
displayFullscreenBtn.addEventListener('click', (event) => {
    convertStoryToPlayable(displayFullscreenBtn, listSelect, null);
});

const downloadBtn = document.getElementById('download');
downloadBtn.addEventListener('click', (event) => {
    downloadStoryHTML(downloadBtn, listSelect);
});

const refreshListBtn = document.getElementById('refresh_list');
refreshListBtn.addEventListener('click', (event) => {
    refreshList(refreshListBtn, listSelect, [displayFullscreenBtn, downloadBtn]);
});

const storyFormatList = document.getElementById('story_format_list');
storyFormatList.innerHTML = '<u>Currently available <b>Story Formats</b> are:</u>';
for (let i = 0; i < storyFormats.length; ++i) {
    storyFormatList.innerHTML += `<br>- ${storyFormats[i].title} <a class="link link-text" onclick="createTemplatePassageFromId(${i})">[create template]</a>`;
}