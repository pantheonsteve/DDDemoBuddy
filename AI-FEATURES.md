# AI Talk Track Generation - Complete Guide

## Overview

The AI Talk Track Generation feature uses OpenAI's GPT-4 with Vision to automatically create professional talk tracks by analyzing screenshots of Datadog pages. This powerful feature saves time and provides customized content based on different presentation personas.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Setting Up Your API Key](#setting-up-your-api-key)
3. [Using Personas](#using-personas)
4. [Generating Talk Tracks](#generating-talk-tracks)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)
7. [API Costs](#api-costs)
8. [Privacy & Security](#privacy--security)

---

## Getting Started

### Prerequisites

- OpenAI API account with API key
- Credit balance in your OpenAI account
- Internet connection for API calls

### Quick Start

1. Get an OpenAI API key
2. Add the key to the extension
3. Choose a persona
4. Generate your first talk track

---

## Setting Up Your API Key

### Step 1: Get Your OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com)
2. Sign in or create an account
3. Navigate to **API Keys** section
4. Click **Create new secret key**
5. Copy the key (starts with `sk-`)
6. Store it safely - you won't see it again!

### Step 2: Add Key to Extension

1. Right-click the extension icon
2. Select **Options**
3. Scroll to **🤖 AI Talk Track Generation** section
4. Paste your API key in the input field
5. Click **Save Key**
6. Click **Test Key** to verify it works

**✓ Success:** You should see "API key is valid!"

**✗ Error:** Check that you copied the full key correctly

---

## Using Personas

Personas define the style, tone, and focus of generated talk tracks.

### Predefined Personas

#### 1. Sales Engineer
- **Focus:** Features, benefits, ROI
- **Style:** Business value, competitive advantages
- **Best For:** Customer-facing demos, sales presentations
- **Example Output:** "This feature helps reduce incident response time by 40%, directly impacting your bottom line..."

#### 2. Solutions Architect
- **Focus:** Technical architecture, integrations
- **Style:** Implementation details, scalability
- **Best For:** Technical deep dives, architecture reviews
- **Example Output:** "The distributed tracing architecture uses OpenTelemetry standards, allowing seamless integration with..."

#### 3. Executive Briefing
- **Focus:** High-level business value, strategic benefits
- **Style:** Concise, metrics-focused, time-to-value
- **Best For:** Executive presentations, board meetings
- **Example Output:** "Datadog provides 360° visibility across your entire stack, reducing MTTR by 50% and..."

#### 4. Technical Deep Dive
- **Focus:** APIs, data models, advanced features
- **Style:** Detailed technical specifications
- **Best For:** Developer audiences, technical training
- **Example Output:** "The query language supports complex aggregations using the following syntax..."

#### 5. Customer Success
- **Focus:** Onboarding, best practices, tips
- **Style:** Educational, supportive, practical
- **Best For:** Training sessions, customer onboarding
- **Example Output:** "Pro tip: Set up custom dashboards early in your journey to track the metrics that matter most to your team..."

### Creating Custom Personas

1. Open **Options** page
2. Scroll to **Personas** section
3. Click **+ Add Custom Persona**
4. Enter persona name (e.g., "DevOps Engineer")
5. Enter description of focus and style
6. Click OK to save

**Example Custom Persona:**
```
Name: DevOps Engineer
Description: Focus on CI/CD integration, automation, infrastructure as code, deployment strategies, and operational best practices with emphasis on GitOps workflows
```

### Editing Custom Personas

1. Find the persona in the list
2. Click **Edit** button
3. Update name or description
4. Click OK to save

### Deleting Custom Personas

1. Find the persona in the list
2. Click **Delete** button
3. Confirm deletion

**Note:** Default personas cannot be deleted

---

## Generating Talk Tracks

### Method 1: From Popup Window (Recommended)

**Best For:** Generating talk tracks while browsing Datadog

#### Basic Steps:

1. Navigate to the Datadog page you want a talk track for
2. Click the extension icon to open the popup
3. Click **🤖 AI Mode** button in the header
4. Select your desired persona from dropdown
5. Read the persona description to confirm it's appropriate
6. Click **📸 Capture & Generate** button
7. Wait 10-30 seconds for generation (don't close the window!)
8. Review the generated talk track in the preview
9. Choose how to save (see options below)
10. Click **← Back** to return to normal mode

#### Save Options:

**When NO existing track matches the URL:**
- **💾 Save as New Track** - Creates a new talk track

**When an EXISTING track matches the URL:**
You'll see a blue notice: "📌 Existing track found: [Track Title]"

Three save options available:

1. **➕ Append to Existing** (Recommended for multi-section pages)
   - Adds new content to the existing track
   - Inserts a horizontal rule separator (`---`)
   - Preserves existing content
   - **Use case:** Generate content for different sections of same page

2. **🔄 Replace Existing**
   - Replaces the entire content of existing track
   - Asks for confirmation first
   - Updates the title if AI generated a better one
   - **Use case:** Completely refresh outdated content

3. **💾 Save as New**
   - Creates a separate track even though one exists
   - **Use case:** Want different personas for same URL

#### What Happens Behind the Scenes:

1. Extension captures full-page screenshot (scrolls if needed)
2. Screenshot is compressed to meet API limits
3. Image + persona prompt sent to OpenAI GPT-4 Vision
4. AI analyzes the UI elements, layout, and content
5. Generates customized talk track in markdown format
6. Returns formatted content for preview
7. Auto-categorizes and creates URL pattern when saved

### Method 2: From Options Page

**Best For:** Bulk generation, careful review before saving

**Note:** This feature is in development. Use Method 1 (popup window) for now.

---

## Generated Content

### What You Get

Each generated talk track includes:

- **Title:** Descriptive name for the page/feature
- **Content:** Markdown-formatted talk track with:
  - Headings for organization
  - **Bold** key points
  - Bullet lists for features
  - Transition suggestions
  - 3-5 main talking points
  - Specific UI element references

### Auto-Populated Fields

When you save a generated track:

- **Title:** Extracted from AI output or inferred from URL
- **Category:** Auto-categorized based on URL
  - `/dashboard` → Dashboards
  - `/apm` → APM
  - `/logs` → Logs
  - etc.
- **URL Pattern:** Created from current URL with wildcards
  - `https://app.datadoghq.com/apm/services` → `*/apm/services*`
  - IDs replaced with wildcards

### Example Generated Talk Track

```markdown
## APM Services Overview

Welcome to the APM Services page, your central hub for monitoring application performance.

### Key Features to Highlight

- **Service Health at a Glance** - Quickly identify problematic services with color-coded health indicators
- **Request Rate & Latency** - Monitor throughput and response times in real-time
- **Error Tracking** - Spot anomalies and errors before they impact users

### Demo Flow

1. Start by explaining the service map view in the top section
2. Point out the P95 latency metric - "Notice how we're consistently under 200ms"
3. Show how clicking a service reveals detailed traces
4. Demonstrate filtering by environment or team

**Transition:** "Now let's drill down into a specific service to see distributed tracing in action..."
```

---

## Advanced Workflows

### Multi-Section Page Strategy

For pages with multiple important sections:

**Workflow:**
1. Navigate to the page
2. Show the top section (e.g., overview)
3. Generate talk track → **Save as New Track**
4. Scroll down to next section (e.g., detailed metrics)
5. Generate again → **➕ Append to Existing**
6. Scroll to final section (e.g., configuration)
7. Generate again → **➕ Append to Existing**

**Result:** One comprehensive talk track covering all sections!

**Example Output:**
```markdown
## Dashboard Overview
- Key metrics at the top
- Quick navigation

---

## Detailed Metrics Section
- Time series graphs
- Custom queries

---

## Configuration Panel
- Settings and preferences
- Customization options
```

### Updating Existing Talk Tracks

If you already have talk tracks but want to refresh them with AI:

1. Navigate to the page
2. Generate new content
3. See "📌 Existing track found" notice
4. Click **🔄 Replace Existing**
5. Confirm replacement
6. Done! Old content replaced with fresh AI-generated version

## Best Practices

### For Best Results

1. **Choose the Right Persona**
   - Match persona to your audience
   - Sales Engineer for customers
   - Technical Deep Dive for developers
   - Executive Briefing for leadership

2. **Review Before Saving**
   - AI is smart but not perfect
   - Edit generated content as needed
   - Add your own insights and examples
   - Verify technical accuracy

3. **Capture at the Right Time**
   - Load the page completely first
   - Close unnecessary panels/modals
   - Show the most important content
   - Position the view to show what you want AI to analyze

4. **Use Append for Long Pages**
   - Generate content for top section first
   - Scroll to show different content
   - Generate and append to build comprehensive track
   - Separator (`---`) automatically added between sections

5. **Iterate if Needed**
   - Try different personas for same page
   - Regenerate if output isn't quite right
   - Combine best parts from multiple generations

6. **Organize Your Library**
   - Use AI for initial drafts
   - Manually refine and personalize
   - Keep titles descriptive
   - Maintain proper categories

### Content Enhancement Tips

After generating:

- Add customer-specific examples
- Insert relevant metrics from demos
- Include transition phrases to other pages
- Add warnings about common mistakes
- Reference related features

---

## Troubleshooting

### Error: "No API key configured"

**Problem:** No API key has been saved

**Solution:**
1. Go to Options page
2. Add your OpenAI API key
3. Click Save Key
4. Try generation again

### Error: "Invalid API key"

**Problem:** The API key is incorrect or expired

**Solution:**
1. Verify the key at platform.openai.com
2. Generate a new key if needed
3. Update key in Options page
4. Click Test Key to verify

### Error: "Rate limit exceeded"

**Problem:** Too many requests in short time

**Solution:**
- Wait 1-2 minutes
- Check your API usage at OpenAI platform
- Consider upgrading your API plan if needed

### Error: "API quota exceeded"

**Problem:** No credit balance in OpenAI account

**Solution:**
1. Go to platform.openai.com/account/billing
2. Add payment method and credits
3. Try again once balance is updated

### Error: "Screenshot capture failed"

**Problem:** Can't capture the page

**Solutions:**
- Refresh the page and try again
- Check page is fully loaded
- Close modal dialogs
- Try on a different Datadog page
- Reload the extension

### Error: "Request timed out"

**Problem:** Page too large or API too slow

**Solutions:**
- Try again (sometimes API is slow)
- Close unnecessary panels on page
- Use a simpler page
- Check internet connection

### Generation Takes Too Long

**Normal Time:** 10-30 seconds

**If Longer:**
- Very large pages take more time
- API may be under heavy load
- Check console for errors (F12)
- Try regenerating

### Generated Content is Off-Topic

**Solutions:**
- Choose a different persona
- Regenerate with same settings (AI is probabilistic)
- Make sure page is displaying relevant content
- Capture after page is fully loaded

### Content is Too Generic

**Solutions:**
- Use more specific personas
- Regenerate a few times
- Edit the generated content
- Add your own specific details

---

## API Costs

### Understanding Pricing

OpenAI charges based on:
- **Input tokens:** Screenshot + prompt
- **Output tokens:** Generated text
- **Model:** GPT-4 with Vision (gpt-4o)

### Estimated Costs (as of December 2024)

**Per Generation:**
- Input: ~2,000-5,000 tokens (screenshot + prompt)
- Output: ~500-1,000 tokens (talk track)
- **Cost per generation: $0.05 - $0.15**

### Cost Optimization Tips

1. **Generate Wisely**
   - Don't regenerate unnecessarily
   - Edit generated content instead of regenerating
   - Use for pages you'll demo frequently

2. **Manage Your Library**
   - Generate once, use many times
   - Export tracks as backup
   - Share with team to avoid duplicate generations

3. **Monitor Usage**
   - Check usage at platform.openai.com/usage
   - Set spending limits in your account
   - Track which tracks were AI-generated

### Budget Planning

**Light Use (5-10 generations/week):**
- ~$2-5 per month

**Moderate Use (20-30 generations/week):**
- ~$10-15 per month

**Heavy Use (50+ generations/week):**
- ~$25-40 per month

**Team Use:**
- One person generates, exports, and shares
- Much more cost-effective than individual generation

---

## Privacy & Security

### Data Handling

**What Gets Sent to OpenAI:**
- Screenshot of current Datadog page
- Selected persona description
- Current URL (for context)

**What Never Gets Sent:**
- Your API key is stored locally only
- Other talk tracks
- Extension settings
- Personal data not visible on screen

### Security Best Practices

1. **API Key Storage**
   - Stored in Chrome's secure storage
   - Never logged to console
   - Never transmitted except to OpenAI
   - Use a dedicated API key for this extension

2. **Screenshot Content**
   - Only capture pages you're comfortable sharing
   - Screenshots may include sensitive data visible on screen
   - Be mindful of customer data in demos
   - Close sensitive panels before capturing

3. **Generated Content**
   - Review for accuracy before using
   - Don't blindly trust AI output
   - Verify technical details
   - Add disclaimers if needed

### OpenAI's Data Usage

Per OpenAI's policy:
- API data not used to train models (for paid tiers)
- Requests processed and discarded
- See: platform.openai.com/docs/models/data-usage

### Compliance Considerations

If you work with:
- **Customer data:** Don't capture screens with PII
- **Confidential data:** Review what's visible before capture
- **Regulated industries:** Check with compliance team first

---

## Advanced Tips

### Prompt Customization

The extension uses a fixed prompt template, but you can influence output by:
- Creating custom personas with specific instructions
- Capturing pages in specific states
- Choosing pages that highlight what you want

### Multi-Language Support

AI can generate in other languages if your persona description includes:
```
Description: Create talk tracks in Spanish, focusing on...
```

### Combining with Manual Editing

Best workflow:
1. Generate AI draft
2. Review and fact-check
3. Add customer-specific examples
4. Insert transition phrases
5. Polish formatting
6. Save final version

### Reusing Across Customers

Generate once, customize per customer:
1. Create base AI talk track
2. Export it
3. Create variations for different customers
4. Import customized versions

---

## FAQ

**Q: Is the AI always accurate?**
A: No. Always review and verify generated content. AI can make mistakes or misunderstand UI elements.

**Q: Can I use AI for non-Datadog pages?**
A: The extension is designed for Datadog, but AI will attempt to generate content for any page you capture.

**Q: How do I get better results?**
A: Use specific personas, capture clean page states, regenerate if needed, and always review/edit output.

**Q: Can the AI see my data?**
A: It only sees what's visible in the screenshot you capture. Don't capture sensitive information.

**Q: Will this work offline?**
A: No. AI generation requires internet connection to reach OpenAI's API.

**Q: Can multiple people share an API key?**
A: Yes, but monitor usage and costs. Better to generate once and export/share tracks.

**Q: How do I delete API key?**
A: Clear the field in Options and click Save Key. This removes it from storage.

**Q: Can AI generate in different formats?**
A: Output is always Markdown. You can manually convert if needed.

---

## Getting Help

**Issues with Extension:**
- Check browser console for errors
- Reload extension
- Restart browser

**Issues with OpenAI API:**
- Check platform.openai.com/status
- Review your usage limits
- Verify billing information

**Questions or Feedback:**
- Open an issue in the repository
- Contact your extension administrator
- Review OpenAI documentation

---

## Version History

**v1.1.0 - AI Features**
- ✨ AI-powered talk track generation
- 📸 Full-page screenshot capture
- 🎭 Predefined personas
- 🎨 Custom persona creation
- 🤖 GPT-4 Vision integration

---

**Happy Generating! 🎉**

Use AI as a starting point, add your expertise, and create amazing talk tracks!

