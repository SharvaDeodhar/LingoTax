"""
LangChain RAG chain using Gemini 1.5 Flash.
The system prompt instructs Gemini to:
  - Respond in the user's language
  - Cite specific document boxes/lines
  - Give actionable tax form instructions.
"""

import json
import asyncio
from supabase import Client
from typing import List, Optional, Dict, Any

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import HumanMessage

from config import settings
from rag.highlightExtractor import find_field_location

# BCP-47 code → language name for injection into the system prompt
LANG_CODE_TO_NAME: dict = {
    "en":      "English",
    "es":      "Spanish",
    "zh-Hans": "Simplified Chinese",
    "zh-Hant": "Traditional Chinese",
    "hi":      "Hindi",
    "ko":      "Korean",
    "vi":      "Vietnamese",
    "pt":      "Portuguese (Brazilian)",
    "ar":      "Arabic",
    "tl":      "Filipino (Tagalog)",
    "bn":      "Bengali",
    "gu":      "Gujarati",
    "pa":      "Punjabi",
    "ta":      "Tamil",
    "te":      "Telugu",
    "ur":      "Urdu",
    "ja":      "Japanese",
    "fr":      "French",
    "de":      "German",
}

_SYSTEM_PROMPT = """\
You are LinguaTax, a friendly and knowledgeable US tax assistant.
The user's preferred language is {language}. You MUST respond entirely in {language}.

You have been provided with excerpts from the user's tax document.
Answer the user's question based ONLY on the provided document context.

Structure EVERY answer in exactly this format (translated into {language}):

**What I found in your document:**
[State the specific value and field name from the document]

**Which box/line it came from:**
[E.g., "W-2, Box 1 – Wages, tips, other compensation: $52,000.00"]

**What to do on your tax form:**
[Actionable instruction: which form, which line, what to enter]

If the answer cannot be found in the document context, say so clearly in {language}
and suggest the user check the relevant section of the form directly.

--- Document context ---
{context}
--- End of context ---\
"""

_llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    google_api_key=settings.gemini_api_key,
    temperature=0.1,
    max_output_tokens=4096,
)

_prompt = ChatPromptTemplate.from_messages(
    [
        ("system", _SYSTEM_PROMPT),
        ("human", "{question}"),
    ]
)

_rag_chain = _prompt | _llm | StrOutputParser()


_GENERAL_SYSTEM_PROMPT = """\
You are LinguaTax, a world-class US tax expert and advisor.
The user's preferred language is {language}. You MUST respond entirely in {language}.

The user is seeking expert guidance on US taxes, credits, and compliance.
{profile_context}

Your Core Tenets:
1. **Unrivaled Depth**: Before answering, perform a comprehensive mental RAG of IRS Internal Revenue Code (IRC) and Treasury Regulations relevant to the topic.
2. **Precision & Clarity**: Explain complex rules in simple, elegant {language}. Always include official English technical terms in parentheses (e.g., "Earned Income Tax Credit").
3. **Contextual Tailoring**: Use every detail of the user's profile ({profile_context}) to provide hyper-relevant advice.
4. **Form-Centricity**: Be the ultimate guide for IRS forms (W-2, 1040, 1099-NEC/MISC, 1098, 8812, etc.). Detail exactly which boxes and lines are affected.
5. **Action-Oriented Strategy**: Provide a clear, step-by-step roadmap for the user to follow.

Advanced Reasoning:
- Analyze multi-state tax interactions (e.g., nexus issues, state tax credits).
- Consider the interaction of federal credits (e.g., interaction between CTC and EITC).
- Check for tax year-specific changes (e.g., 2024 tax bracket adjustments).
- Provide a summary of required supporting documentation.

Safety & Compliance:
- MANDATORY: State clearly that this is general educational information and NOT professional legal or tax advice.
- If the situation is high-stakes or ambiguous, explicitly advise consultation with a qualified tax professional or review of specific IRS Publications.
"""

_general_prompt = ChatPromptTemplate.from_messages(
    [
        ("system", _GENERAL_SYSTEM_PROMPT),
        MessagesPlaceholder(variable_name="chat_history"),
    ]
)

_general_chain = _general_prompt | _llm | StrOutputParser()


_PLAN_SYSTEM_PROMPT = """\
You are LinguaTax, a senior US tax strategy consultant. 
The user's preferred language is {language}. You MUST respond entirely in {language}.

Your task is to develop a comprehensive, multi-layered planning strategy for the user's inquiry.
{profile_context}

BEFORE generating the plan, you MUST perform an exhaustive internal analysis:
1. **Jurisdictional Scan**: Identify federal, state, and local tax implications (especially {profile_context}).
2. **Form Synthesis**: List every IRS form and schedule that might be triggered (e.g., 1040, Sch A/C/SE, 8863, etc.).
3. **Credit/Deduction Audit**: Identify high-probability tax breaks the user might miss.
4. **Edge Case Detection**: Consider residency, filing status shifts, or income type nuances.
5. **RAG Database Alignment**: Mentally crawl through available IRS publications and rulings to find specific rules.

Guidelines:
- DO NOT provide the final answer or specific numbers yet.
- DO NOT reveal raw chain-of-thought or internal scratchpads.
- Use authoritative, expert, and helpful {language}.
- The plan must be specific, logical, and structured for maximum clarity.

Format: Provide ONLY a detailed bulleted list of planning steps (3-7 bullets) in {language}. 
Be specific—mention forms and rules by name.
"""

_plan_prompt = ChatPromptTemplate.from_messages(
    [
        ("system", _PLAN_SYSTEM_PROMPT),
        MessagesPlaceholder(variable_name="chat_history"),
    ]
)

_plan_chain = _plan_prompt | _llm | StrOutputParser()


async def generate_plan(
    question: str,
    language_code: str = "en",
    profile_summary: str = "",
    chat_history: Optional[list] = None,
    images: Optional[list] = None,
):
    """
    Generate a brief, high-level plan for answering the user's question as an async generator.
    """
    language_name = LANG_CODE_TO_NAME.get(language_code, "English")

    profile_context = ""
    if profile_summary:
        profile_context = (
            "Here is what we know about this user's tax situation:\n"
            f"{profile_summary}\n"
        )

    if chat_history is None:
        chat_history = []
    else:
        chat_history = chat_history.copy()

    msg_content = [{"type": "text", "text": question}]
    if images:
        for img in images:
            msg_content.append(
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:{img['mime_type']};base64,{img['data']}"},
                }
            )

    chat_history.append(HumanMessage(content=msg_content))

    try:
        async for chunk in _plan_chain.astream(
            {
                "language": language_name,
                "profile_context": profile_context,
                "chat_history": chat_history,
            }
        ):
            yield chunk
    except Exception as e:
        print(f"Error generating plan: {e}")
        yield ""



_HIGHLIGHT_SYSTEM_PROMPT = """\
You are an intent detection layer for a US tax assistant.
Determine if the user's question is asking "where" to enter a specific piece of information on a tax form.

Focus specifically on phrases like:
"Where do I put my..."
"Where do I enter..."
"Which box is for..."
"What line do I use for..."

If it is a highlighting request, output a JSON object:
{{"needs_highlight": true, "field_label": "The specific item they are asking about, e.g., 'first name', 'SSN', 'wages'"}}
If it is NOT a highlighting request, output:
{{"needs_highlight": false, "field_label": null}}

Your output must be ONLY valid JSON matching this schema, with no markdown formatting or other text.
"""

_highlight_prompt = ChatPromptTemplate.from_messages(
    [
        ("system", _HIGHLIGHT_SYSTEM_PROMPT),
        ("human", "{question}"),
    ]
)

_highlight_chain = _highlight_prompt | _llm | StrOutputParser()


async def check_for_highlight(question: str) -> dict:
    """
    Checks if the question needs a visual highlight and extracts the field label.
    """
    try:
        response = await _highlight_chain.ainvoke({"question": question})
        # Clean up any potential markdown formatting from the response
        cleaned = response.replace("```json", "").replace("```", "").strip()
        data = json.loads(cleaned)
        return data
    except Exception as e:
        print(f"Error checking for highlight: {e}")
        return {"needs_highlight": False, "field_label": None}

def answer_question(
    question: str,
    chunks: List[dict],
    language_code: str = "en",
) -> str:
    """
    Generate a multilingual RAG answer.

    question: user's raw question (in any language)
    chunks:   retrieved chunks from retrieve_chunks()
    language_code: BCP-47 code, e.g. "es", "hi", "zh-Hans"
    """
    language_name = LANG_CODE_TO_NAME.get(language_code, "English")

    context = "\\n\\n---\\n\\n".join(
        [f"[Page {c['metadata'].get('page', '?')}] {c['chunk_text']}" for c in chunks]
    )

    if not context:
        context = "No relevant content found in the document."

    return _rag_chain.invoke(
        {
            "question": question,
            "context": context,
            "language": language_name,
        }
    )


def answer_general_tax_question(
    question: str,
    language_code: str = "en",
    profile_summary: str = "",
    chat_history: Optional[list] = None,
    images: Optional[list] = None,
) -> str:
    """
    Generate a multilingual answer for general tax questions (no document context).
    Optionally includes a summary of the user's tax profile for personalized advice.

    images: optional list of dicts like:
      { "mime_type": "image/png", "data": "<base64_without_prefix>" }
    """
    language_name = LANG_CODE_TO_NAME.get(language_code, "English")

    profile_context = ""
    if profile_summary:
        profile_context = (
            "Here is what we know about this user's tax situation:\n"
            f"{profile_summary}\n"
            "Use this context to give more specific and relevant advice."
        )

    if chat_history is None:
        chat_history = []

    # Build a multimodal HumanMessage (text + optional images)
    msg_content = [{"type": "text", "text": question}]
    if images:
        for img in images:
            msg_content.append(
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:{img['mime_type']};base64,{img['data']}"},
                }
            )

    chat_history.append(HumanMessage(content=msg_content))

    return _general_chain.invoke(
        {
            "language": language_name,
            "profile_context": profile_context,
            "chat_history": chat_history,
        }
    )


async def stream_general_tax_question(
    question: str,
    language_code: str = "en",
    profile_summary: str = "",
    chat_history: Optional[list] = None,
    images: Optional[list] = None,
):
    """
    Generate an async streaming response for general tax questions.

    Yields text chunks (strings).
    """
    language_name = LANG_CODE_TO_NAME.get(language_code, "English")

    profile_context = ""
    if profile_summary:
        profile_context = (
            "Here is what we know about this user's tax situation:\n"
            f"{profile_summary}\n"
            "Use this context to give more specific and relevant advice."
        )

    if chat_history is None:
        chat_history = []

    msg_content = [{"type": "text", "text": question}]
    for img in (images or []):
        msg_content.append(
            {
                "type": "image_url",
                "image_url": {"url": f"data:{img['mime_type']};base64,{img['data']}"},
            }
        )

    chat_history.append(HumanMessage(content=msg_content))

    # 1. Thinking Start
    yield {"type": "thinking", "status": "start"}
    await asyncio.sleep(1.5) # Perceived thinking duration to show complexity

    # 2. Stream Plan
    async for chunk in generate_plan(
        question=question,
        language_code=language_code,
        profile_summary=profile_summary,
        chat_history=chat_history,
        images=images,
    ):
        if chunk:
            yield {"type": "plan_token", "text": chunk}
            await asyncio.sleep(0.04) # Slower plan streaming for better readability

    # 3. Transition to Generating
    yield {"type": "thinking", "status": "end"} # Explicitly end thinking phase
    yield {"type": "status_update", "status": "responding"} # Tell UI to show "Generating..."
    await asyncio.sleep(1.2) # Pause so "Generating..." is visible

    # 4. Stream Answer
    async for chunk in _general_chain.astream(
        {
            "language": language_name,
            "profile_context": profile_context,
            "chat_history": chat_history,
        }
    ):
        yield {"type": "answer_token", "text": chunk}

    # 4. Thinking End & Done
    yield {"type": "thinking", "status": "end"}
    yield {"type": "done"}


# ─── Document section summarization ──────────────────────────────────────────

_SUMMARIZE_SYSTEM_PROMPT = """\
You are LinguaTax, a world-class multilingual US tax expert and advisor.
The user's preferred language is {language}. You MUST respond entirely in {language}.

You are given the extracted text content of a tax document. Your task is to produce a HIGHLY DETAILED, expanded auto-summary for this document.

**Your response MUST follow this structure exactly:**

### 1. Document Identification
- State the legal name of the form (e.g., "IRS Form 1040") and the tax year found.
- Start with the exact phrase: "Here’s a structured summary of your [Document Name]..."

### 2. Section-by-section breakdown (What each part is for)
Identify EVERY major physical section found in the document text. For EACH section, you MUST provide:
- **What it is**: A concise one-sentence description of the section's official purpose.
- **What you need to provide**: A bulleted list of the specific data, checkboxes, or dollar amounts the taxpayer must enter or confirm in this section.
- **Common pitfalls**: 1-2 bullets on significant mistakes or often-overlooked details for this specific area.
- **Related documents/forms**: Explicitly list all supporting forms required (e.g., W-2, 1099-INT/DIV/B, Schedule 1, Schedule A/C/D, etc.).

*Required Focus for Form 1040:* If this is a Form 1040, you MUST detail the following sections if found:
- Header/Taxpayer Info
- Dependents
- Digital Assets
- Income (Wages, Interest, IRA, etc.)
- Adjustments (Schedule 1)
- Deductions (Standard/Itemized)
- Tax & Credits
- Payments (Withholding)
- Refund/Owe
- Signatures

### 3. Tax Season Checklist
Provide a customized "What to gather next" checklist tailored to the document type discovered.

**Constraints:**
- Use English for official box names and line labels in parentheses, e.g., "Wages (Line 1z)".
- Aim for a comprehensive length (2-3x longer than a standard summary).
- DO NOT generate more than one greeting.
- Use valid Markdown headers (###).
- If information for a requested section is missing from the document, omit that specific section breakdown.
- Respond ONLY in {language}.

--- Document content ---
{context}
--- End of content ---\
"""

_summarize_prompt = ChatPromptTemplate.from_messages(
    [
        ("system", _SUMMARIZE_SYSTEM_PROMPT),
        ("human", "Please summarize this tax document section by section in {language}."),
    ]
)

_summarize_chain = _summarize_prompt | _llm | StrOutputParser()


def summarize_document_sections(
    chunks: List[dict],
    language_code: str = "en",
) -> str:
    """
    Produce a structured section-by-section summary of a document
    from its chunks. Uses all chunks for comprehensive coverage.
    """
    language_name = LANG_CODE_TO_NAME.get(language_code, "English")

    context = "\n\n---\n\n".join(
        [f"[Page {c['metadata'].get('page', '?')}] {c['chunk_text']}" for c in chunks]
    )

    if not context:
        return "No content found in this document to summarize."

    return _summarize_chain.invoke(
        {
            "context": context,
            "language": language_name,
        }
    )
async def stream_document_chat(
    question: str,
    chunks: List[dict],
    language_code: str = "en",
    is_summary: bool = False,
    db: Optional[Client] = None,
    document_id: Optional[str] = None
):
    """
    Generate an async streaming response for document-specific chat or auto-summary.
    Yields events for progress tracking and final answer tokens.
    """
    language_name = LANG_CODE_TO_NAME.get(language_code, "English")

    # 1. Reading / Processing stage
    yield {"type": "status", "stage": "reading_document"}
    await asyncio.sleep(0.5)

    if is_summary:
        yield {"type": "status", "stage": "building_chunks"}
        # Prepare context from ALL chunks
        context = "\n\n---\n\n".join(
            [f"[Page {c['metadata'].get('page', '?')}] {c['chunk_text']}" for c in chunks]
        )
        await asyncio.sleep(0.8)
        
        yield {"type": "status", "stage": "writing_answer"}
        async for chunk in _summarize_chain.astream(
            {
                "context": context,
                "language": language_name,
            }
        ):
            yield {"type": "answer_token", "text": chunk}
            await asyncio.sleep(0.01)
    else:
        yield {"type": "status", "stage": "checking_rag_db"}
        await asyncio.sleep(0.6)

        yield {"type": "status", "stage": "selecting_sources"}
        # Context from top-k chunks
        context = "\\n\\n---\\n\\n".join(
            [f"[Page {c['metadata'].get('page', '?')}] {c['chunk_text']}" for c in chunks]
        )
        await asyncio.sleep(0.6)
        
        # Check for visual highlight request
        if db and document_id:
            yield {"type": "status", "stage": "preparing_highlight"}
            print(f"[HIGHLIGHT] Checking highlight for question: {question}")
            highlight_intent = await check_for_highlight(question)
            print(f"[HIGHLIGHT] Intent result: {highlight_intent}")
            
            if highlight_intent.get("needs_highlight") and highlight_intent.get("field_label"):
                label = highlight_intent["field_label"]
                print(f"[HIGHLIGHT] Looking for field: {label}")
                try:
                    # Try to extract the bounding box from the PDF
                    location = find_field_location(db, document_id, label)
                    print(f"[HIGHLIGHT] Location result: {location}")
                    
                    if location:
                        yield {
                            "type": "highlight",
                            "highlight": {
                                "page": location["page"],
                                "bbox": location["bbox"],
                                "label": location["label"],
                                "method": location["method"]
                            }
                        }
                        await asyncio.sleep(0.5)
                except Exception as e:
                    print(f"[HIGHLIGHT] Error during field extraction: {e}")

        yield {"type": "status", "stage": "writing_answer"}
        async for chunk in _rag_chain.astream(
            {
                "question": question,
                "context": context,
                "language": language_name,
            }
        ):
            yield {"type": "answer_token", "text": chunk}
            await asyncio.sleep(0.01)

    yield {"type": "done"}
