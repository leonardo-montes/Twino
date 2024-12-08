import Passage from './extwee/Passage.js';
import { Story } from './extwee/Story.js';
import { parse as parseStoryFormat } from './extwee/StoryFormat/parse.js';
import { compile as compileTwine2HTML } from './extwee/Twine2HTML/compile.js';

// List of story formats, along with there versions and template file.
// The template file is used to create template cards and help users starting out.
export const storyFormats = [
    {
        'title': 'harlowe-3.3.9',
        'template': `STYLES
Font variants:
(text-style:"bold")[Your Text Here]

(text-style:"italic")[Your Text Here]

(text-style:"mark")[Your Text Here]

Underline and strikes:
(text-style:"mark")[Your Text Here]

(text-style:"underline")[Your Text Here]

(text-style:"double-underline")[Your Text Here]

(text-style:"wavy-underline")[Your Text Here]

(text-style:"strike")[Your Text Here]

(text-style:"double-strike")[Your Text Here]

(text-style:"wavy-strike")[Your Text Here]

Superscript and subscript:
(text-style:"superscript")[Your Text Here]

(text-style:"subscript")[Your Text Here]

Outlines:
(text-style:"outline")[Your Text Here]

(text-style:"shadow")[Your Text Here]

(text-style:"emboss")[Your Text Here]

(text-style:"blur")[Your Text Here]

(text-style:"blurrier")[Your Text Here]

(text-style:"smear")[Your Text Here]

Letter spacing:
(text-style:"condense")[Your Text Here]

(text-style:"expand")[Your Text Here]

Flip and stretches:
(text-style:"mirror")[Your Text Here]

(text-style:"upside-down")[Your Text Here]

(text-style:"tall")[Your Text Here]

(text-style:"flat")[Your Text Here]

Animations:
(text-style:"blink")[Your Text Here]

(text-style:"fade-in-out")[Your Text Here]

(text-style:"rumble")[Your Text Here]

(text-style:"shudder")[Your Text Here]

(text-style:"sway")[Your Text Here]

(text-style:"buoy")[Your Text Here]

(text-style:"fidget")[Your Text Here]

Combine styles:
(text-style:"bold","underline","superscript","outline","condense","tall","buoy")[Your Text Here]

COLOURS
(text-colour:(hsl:210,0.8039,0.5,0.3))[Your Text Here]

(bg:green)[Your Text Here]

(bg:(gradient: 15, 0,#ffffff,0.5,#000000,1,#ffffff))[Your Text Here]

LISTS AND ITEMS
Bullet list:
* Your Text Here
* Your Text Here

Numbered list:
0. Your Text Here
0. Your Text Here
0. Your Text Here

#Heading Text

---
Your Text Here

ALIGNEMENT AND COLUMNS
Align left:
(align:'<==')[Your Text Here]

Align right:
(align:'==>')[Your Text Here]

Align center:
(align:'=><=')[Your Text Here]

Align justify:
(align:'<==>')[Your Text Here]

Miscellaneous:
(box:'=XXX=')[Your Text Here]
(box:'=======XXXXXX=======')[Your Text Here]

Columns:
=|=
Column 1
=|=
Column 2
=|=
Column 3
|==|

LINK
[[My link text->Next Passage]]

MISCELLANEOUS:
Verbatim (ignore all markup inside):
\`Verbatim Text\`

HTML Comment (not run in-game)
<!--Comment Text-->

// This is a Miro editor only comment
// If '//' is at the beginning of the line, the entire line is skipped.
A comment can also be added at the end of a line // so the rest is not exported`
    },
    {
        'title': 'chapbook-2.2.0',
        'template': `STYLE
Bold:
**My Text**

Italic:
*My Text*

Monospaced:
\`My Text\`

Small caps:
~~My Text~~

Blockquote:
<blockquote>Text</blockquote>

Bulleted list:
- Item
- Item

Fork list:
> Link
> Link

Numbered list:
1. Item
2. Item

Section break:
***

LINK:
Passage link:
{link to: 'Passage name', label: 'Label text'}

Restart link:
{restart link, label: 'Label text'}

Reveal passage link:
{reveal link: 'Label text', passage: 'Passage name'}

Reveal text link:
{reveal link: 'Label text', text: 'Displayed text'}

MISCELLANEOUS:
// This is a Miro editor only comment
// If '//' is at the beginning of the line, the entire line is skipped.
A comment can also be added at the end of a line // so the rest is not exported`
    },
    {
        'title': 'paperthin-1.0.0',
        'template': `Paperthin is a proofing format. It will just display the story as is without any fancy effect or transition.`
    },
    {
        'title': 'snowman-2.0.2',
        'template': `STYLE
Bold:
**My Text**

Italic:
*My Text*

Monospaced:
\`My Text\`

Small caps:
~~My Text~~

Blockquote:
<blockquote>Text</blockquote>

Bulleted list:
- Item
- Item

Fork list:
> Link
> Link

Numbered list:
1. Item
2. Item

Section break:
***

LINK:
Passage link:
[[Next Passage]]

MISCELLANEOUS:
// This is a Miro editor only comment
// If '//' is at the beginning of the line, the entire line is skipped.
A comment can also be added at the end of a line // so the rest is not exported`
    },
    {
        'title': 'sugarcube-2.37.3',
        'template': `STYLE
Bold:
<b>My Text</b>

Italic:
<i>My Text</i>

Small caps:
~~My Text~~

Blockquote:
>Text

Bulleted list:
* Item
** Item further away
*** Item even further away
* Item

LINK:
Passage link:
[[Next Passage]]

MISCELLANEOUS:
// This is a Miro editor only comment
// If '//' is at the beginning of the line, the entire line is skipped.
A comment can also be added at the end of a line // so the rest is not exported`
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