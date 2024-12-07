import Passage from './extwee/Passage.js';
import { Story } from './extwee/Story.js';
import { parse as parseStoryFormat } from './extwee/StoryFormat/parse.js';
import { compile as compileTwine2HTML } from './extwee/Twine2HTML/compile.js';

export function removeAllTags(input) {
    return input.replace(/<\/?[^>]+(>|$)/g, ''); // Match any tag
}

async function getTags(obj) {
    let tags = [];
    for (let i = 0; i < obj.tagIds.length; ++i) {
        const tag = await miro.board.getById(obj.tagIds[i]);
        tags.push(removeAllTags(tag.title));
    }
    return tags;
}

export async function convertMiroToHTMLStory(listSelect, startCard) {
    try {
        // Get the story
        let frameId = null;
        let startCardId = null;
        if (listSelect != null) {
            frameId = listSelect.options[listSelect.selectedIndex].value;
        } else {
            frameId = startCard.parentId;
            startCardId = startCard.id;
        }
        const frame = await miro.board.getById(frameId);
        
        // Find start frame
        let startNode = null;
        let title = null;
        let ifid = null;
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
                } 
            }

            if (child.type == 'card') {
                rawPassages.push(child);
                continue;
            }
        }

        // Find the start
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
        
        // Create the passages
        let passages = [];
        //let startId = 0;
        for (let i = 0; i < rawPassages.length; ++i) {
            let passage = new Passage(removeAllTags(rawPassages[i].title), rawPassages[i].description, await getTags(rawPassages[i]));
            passages.push(passage);
            if (startCardId == rawPassages[i].id) {
                story.start = passage.name;
                //startId = passages.length - 1;
            }
        }

        // Set the start as the last element
        //let startPassage = passages[startId];
        //passages.splice(startId, 1);
        //passages.splice(0, 0, startPassage);

        // Set passages
        story.passages = passages;

        // Create the story from a Twee File
        /*const storyResponse = await fetch('/test.twee');
        const storyData = await storyResponse.text();
        //const story = parseTwee(storyData);*/
        //story = parseTwee(storyData);
        
        // Import the default format
        const storyFormatResponse = await fetch('/format.js');
        const storyFormatData = await storyFormatResponse.text();
        const storyFormat = parseStoryFormat(storyFormatData);

        // Compile and return
        return compileTwine2HTML(story, storyFormat);
    } catch (error) {
        console.error('Error:', error);
    }
    return null;
}

export async function convertStoryToPlayable(btn, modal, listSelect, startCard) {
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
        
        let blob = new Blob([htmlCompiledStory], { type: 'text/html' });
        const url = URL.createObjectURL(blob);

        // Open the URL in a new tab
        if (!modal) {
            window.open(url, '_blank');
        } else {
            //const { waitForClose } = await miro.board.ui.openModal({ url: 'reader.html', data: htmlCompiledStory }); 
            //await waitForClose();
            window.open(url, '_blank'); // Temp
        }
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