import Passage from './extwee/Passage.js';
import { Story } from './extwee/Story.js';
import { parse as parseStoryFormat } from './extwee/StoryFormat/parse.js';
import { compile as compileTwine2HTML } from './extwee/Twine2HTML/compile.js';

// List of story formats, along with there versions and template file.
// The template file is used to create template cards and help users starting out.
export const storyFormats = [
    {
        'title': 'harlowe-3.3.9',
        'template': ``
    },
    {
        'title': 'chapbook-2.2.0',
        'template': ''
    },
    {
        'title': 'paperthin-1.0.0',
        'template': ''
    },
    {
        'title': 'snowman-2.0.2',
        'template': ''
    },
    {
        'title': 'sugarcube-2.37.3',
        'template': ''
    },
];


// Removes all the tags <> and </> from an input
// Return: string
export function removeAllTags(input) {
    return input.replace(/<\/?[^>]+(>|$)/g, ''); // Match any tag
}

// Get the Miro tags of a Miro element.
// Return: Array of strings
async function getTags(obj) {
    let tags = [];
    for (let i = 0; i < obj.tagIds.length; ++i) {
        const tag = await miro.board.getById(obj.tagIds[i]);
        tags.push(removeAllTags(tag.title));
    }
    return tags;
}

// Cleans the Miro Card Description from the junk.
// By default all line will be incased with <p></p> and some line breaks, we have to remove them.
// We also add the ability to have comments using '//'. If a line starts with it it will be ignored
// so that there is no empty lines left by it.
// Return: string
function cleanDescription (description) {
    description = description.replace(/<p>/gi, '');
    description = description.replace(/<br\s*\/?>/gi, '');
    description = description.replace(/&lt;/gi, '\<');
    description = description.replace(/&gt;/gi, '\>');
    description = description.replace(/&#39;/gi, '\'');

    let lines = description.split('<\/p>');
    description = '';
    for (let i = 0; i < lines.length; ++i) {
        let line = lines[i];
        if (line.startsWith('//'))
            continue;
        if (line.includes('//')) {
            let id = line.indexOf('//');
            line = line.substring(0, id);
        }
        description += line + '\n';
    }

    return description;
}

// Converts a Miro story (so a frame, with a title, story format, IFID, start, and passages) into
// a Twine Story object.
// Return: Story?
export async function convertMiroToHTMLStory(listSelect, startCard) {
    try {
        // Get the story's frame
        let frameId = null;
        let startCardId = null;
        if (listSelect != null) {
            frameId = listSelect.options[listSelect.selectedIndex].value;
        } else {
            frameId = startCard.parentId;
            startCardId = startCard.id;
        }
        const frame = await miro.board.getById(frameId);
        
        // Find story data (start node if required, title, IFID, story format, and passages)
        let startNode = null;
        let title = null;
        let ifid = null;
        let formatTitle = null;
        let rawPassages = [];
        for (let j = 0; j < frame.childrenIds.length; ++j)
        {
            const child = await miro.board.getById(frame.childrenIds[j]);
            const metadata = await child.getMetadata('twine-data');
            if (metadata != null) {
                if (startNode == null && metadata.type == 'start-node') {
                    startNode = child;
                    continue;
                } else if (title == null && metadata.type == 'title-field') {
                    title = removeAllTags(child.content);
                    continue;
                } else if (ifid == null && metadata.type == 'ifid-field') {
                    ifid = removeAllTags(child.content);
                    continue;
                }  else if (formatTitle == null && metadata.type == 'format-field') {
                    formatTitle = removeAllTags(child.content);
                    continue;
                } 
            }

            if (child.type == 'card') {
                rawPassages.push(child);
                continue;
            }
        }

        // Early-out
        if (title == null)
        {
            await miro.board.notifications.showError(`No title was found!`);
            return null;
        }
        if (ifid == null)
        {
            await miro.board.notifications.showError(`No IFID was found!`);
            return null;
        }
        if (formatTitle == null)
        {
            await miro.board.notifications.showError(`No Story Format was found!`);
            return null;
        }
        if (rawPassages.length <= 0)
        {
            await miro.board.notifications.showError(`No Passages were found!`);
            return null;
        }

        // Find the start if required (skip if we are testing from a card)
        if (startCardId == null) {
            // Early-out
            if (startNode == null)
            {
                await miro.board.notifications.showError(`No Start Node was found!`);
                return null;
            }

            // Create the hierarchy from the start node
            const connectors = await startNode.getConnectors(); 
            if (connectors.length <= 0)
            {
                await miro.board.notifications.showError(`Start Node is not connected to any nodes!`);
                return null;
            }
            if (connectors.length > 1)
            {
                await miro.board.notifications.showError(`Start Node has more than one connection!`);
                return null;
            }
            startCardId = connectors[0].end.item;
        }

        // Create the story data
        let story = new Story(title);
        story.IFID = ifid;
        let format = formatTitle.split('-');
        story.format = format[0];
        story.formatVersion = format[1];
        
        // Create the passages
        let passages = [];
        for (let i = 0; i < rawPassages.length; ++i) {
            let passage = new Passage(removeAllTags(rawPassages[i].title), cleanDescription(rawPassages[i].description), await getTags(rawPassages[i]));
            passages.push(passage);
            if (startCardId == rawPassages[i].id) {
                story.start = passage.name;
            }
        }

        // Set passages
        story.passages = passages;

        // Create the story from a Twee File
        /*const storyResponse = await fetch('/test.twee');
        const storyData = await storyResponse.text();
        //const story = parseTwee(storyData);*/
        //story = parseTwee(storyData);
        
        // Import the default format
        const storyFormatResponse = await fetch(`/${formatTitle}.js`);
        const storyFormatData = await storyFormatResponse.text();
        const storyFormat = parseStoryFormat(storyFormatData);

        // Compile and return
        return compileTwine2HTML(story, storyFormat);
    } catch (error) {
        console.error('Error:', error);
    }
    return null;
}

// Convert the selected story or card to a Twine Story, compile it and open in a new Tab.
// /!\ I tried adding the modal view from Miro, but it was not working properly for some reason
//     (start passage would be ignored and a random passage would be chosen), so I removed it.
export async function convertStoryToPlayable(btn, listSelect, startCard) {
    // Button loading
    if (btn != null && !btn.classList.contains('button-loading'))
        btn.classList.add('button-loading');

    try {
        // Create the compiled story
        const htmlCompiledStory = await convertMiroToHTMLStory(listSelect, startCard);
        if (htmlCompiledStory == null)
        {
            await miro.board.notifications.showError(`Could not convert board to a story!`);
            return;
        }
        
        // Turn into a blob and generate a URL
        let blob = new Blob([htmlCompiledStory], { type: 'text/html' });
        const url = URL.createObjectURL(blob);

        // Open the URL in a new tab
        window.open(url, '_blank');

        // Dispose of the URL and blob
        URL.revokeObjectURL(url);
        blob = null;
    
        // Display the notification on the board UI.
        await miro.board.notifications.showInfo(`Twine story opened in a new window!`);
    } catch (error) {
        console.error('Error:', error);
        await miro.board.notifications.showError(`Error while generating the story...`);
    }

    // Remove loading
    if (btn != null)
        btn.classList.remove('button-loading');
}