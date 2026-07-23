---
title: "Site Organization"
categories:
  - Meta
redirect_from: []
---

# Site Organization 

Content is organized as a shallow hierarchy, moving from broad generalized domains
of organizational concern to operational areas within a domain  (and potentially,
an intervening sub-area)  --  all the way down to the level of individual tools (one per page).

- _Domain →_
    - _Operational Area →_
        - _Operational Sub-area →_
            - _Task →_
                - _Candidate Tool_


### Relations to Wiki Categories

In Wiki-speak each of these levels is simply a 
[_page_ _category_](https://en.wikipedia.org/wiki/Wikipedia:Contents/Categories).
The left-hand navigation panel mirrors this category hierarchy. Top-level entries — such as
_Operations_ or _Communications_ — link to domain-level Wiki category pages
and are maintained by our site administrators.

Below the _domain_ level (i.e., below the _top level_), categories can be
added by any site user as needed (but note site admins might roll your
proposed category into an existing one or rename it.)

To assign a page to a category, place the following tag near the bottom of
the page's wikitext, replacing `CategoryName` with the exact category name
(spaces allowed; case-sensitive):

 <nowiki>[[Category:CategoryName]]</nowiki>

A page can belong to more than one category — add one tag per line. The
New Submission form handles this automatically via the _Category_ tree
selector.


### Guidelines for New Category Additions

#### Short Names

Keep the name under three words (ideally two, as the side panel nav tree 
might start word wrapping or exhibiting other rendering issues.)

#### Check for Dups

Verify there is no similar category before you add a new one.

#### Task Level Category Rules

Each _Task_ should be a short phrase indicating a concrete action undertaken by
technicians in service of either special projects, or ongoing operations.

Tasks can be associated with more than one recommended tool. On any tool page
we might have optional discussion of why that tool was selected over rejected alternatives, together
with a discussion of those alternatives. But as soon as we start accumulating more than one
viable candidate for a task, each one should not only get its own page. But we should
create a page 'Rejected Alternatives' at the level of the immediate parent Task
of the page that is now joined by its new sibling pages.

#### Tool Page Naming Convention

Tool page titles are composed of two parts:

    {Company Name} - {Tagline}

The **tagline** is a 2–10 word phrase describing what the tool does in the
context of this Wiki's operational area (validated by the New Submission form).
Example: `Words of Justice - AI co-pilot for Palestine advocacy`.

A redirect from the bare company name (e.g. `WordsOfJustice`) is created
automatically so that short-form links and searches still resolve to the full
page.


