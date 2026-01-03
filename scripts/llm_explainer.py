"""
LLM Explanation Polisher - Clinical Intelligence Platform
===========================================================
Uses local LLM (deepseek-r1 via Ollama) to polish rule-based explanations.

SAFETY RULES:
- LLM only rephrases existing facts
- NEVER generates diagnoses
- NEVER generates treatment advice
- All medical assertions come from rule-based engine

Usage:
    from llm_explainer import LLMExplainer
    explainer = LLMExplainer()
    polished = explainer.polish("Blood sugar increased 29% over 18 months")
"""

import json
from typing import Dict, List, Any, Optional

try:
    import ollama
    OLLAMA_AVAILABLE = True
except ImportError:
    OLLAMA_AVAILABLE = False
    print("⚠️ Ollama not installed. Run: pip install ollama")


# =============================================================================
# CONFIGURATION
# =============================================================================

MODEL_NAME = "deepseek-r1:latest"

# System prompt - constrains LLM to only rephrase, never add medical claims
SYSTEM_PROMPT = """You are a clinical explanation assistant. Your ONLY job is to rephrase medical facts into clear, readable language.

CRITICAL RULES:
1. You may ONLY rephrase the facts given to you
2. You must NEVER add new medical information
3. You must NEVER suggest diagnoses
4. You must NEVER recommend treatments
5. You must NEVER use phrases like "you should", "you need to", or "I recommend"
6. Keep explanations factual and time-based
7. Use simple language a patient could understand

Your output should be a natural paragraph that contains ONLY the information provided.
"""


# =============================================================================
# LLM EXPLAINER
# =============================================================================

class LLMExplainer:
    """
    Uses local Ollama LLM to polish rule-based explanations.
    Falls back to original text if LLM unavailable.
    """
    
    def __init__(self, model_name: str = MODEL_NAME):
        self.model_name = model_name
        self.available = OLLAMA_AVAILABLE
        
        if self.available:
            # Test connection
            try:
                ollama.list()
            except Exception as e:
                print(f"⚠️ Ollama not running: {e}")
                self.available = False
    
    def polish(self, explanation_facts: List[str], risk_level: str = "MEDIUM") -> str:
        """
        Polish a list of rule-based facts into natural language.
        
        Args:
            explanation_facts: List of factual statements from rule engine
            risk_level: HIGH, MEDIUM, or LOW
            
        Returns:
            Polished natural language explanation
        """
        if not self.available or not explanation_facts:
            return "; ".join(explanation_facts) if explanation_facts else ""
        
        # Build prompt
        facts_text = "\n".join(f"- {fact}" for fact in explanation_facts)
        
        prompt = f"""The following are verified medical facts about a patient. Rephrase them into a single, clear paragraph for clinical staff. Do not add any new information.

Risk Level: {risk_level}

Facts:
{facts_text}

Write a clear, professional summary:"""
        
        try:
            response = ollama.chat(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt}
                ],
                options={"temperature": 0.3}  # Low temperature for consistency
            )
            
            polished = response["message"]["content"].strip()
            
            # Safety check - ensure no diagnostic language slipped through
            unsafe_phrases = ["should", "recommend", "diagnosis", "diagnose", "treat", "prescribe"]
            for phrase in unsafe_phrases:
                if phrase.lower() in polished.lower():
                    print(f"⚠️ Safety check failed: '{phrase}' found in output")
                    return "; ".join(explanation_facts)
            
            return polished
            
        except Exception as e:
            print(f"⚠️ LLM error: {e}")
            return "; ".join(explanation_facts)
    
    def polish_explanation(self, explanation: Dict[str, Any]) -> Dict[str, Any]:
        """
        Polish a complete explanation dict from the ExplanationEngine.
        
        Args:
            explanation: Dict with 'summary', 'risk_level', 'contributing_factors'
            
        Returns:
            Same dict with polished 'summary_polished' field added
        """
        facts = explanation.get("summary", [])
        risk_level = explanation.get("risk_level", "MEDIUM")
        
        polished = self.polish(facts, risk_level)
        
        return {
            **explanation,
            "summary_polished": polished,
            "llm_used": self.available and bool(polished),
        }


# =============================================================================
# STANDALONE FUNCTION
# =============================================================================

def create_llm_explainer() -> LLMExplainer:
    """Create an LLM explainer with default settings."""
    return LLMExplainer()


# =============================================================================
# MAIN (Demo)
# =============================================================================

def main():
    """Demo the LLM explanation polisher."""
    print("=" * 60)
    print("🏥 Clinical Intelligence Platform - LLM Explainer Demo")
    print(f"   Using model: {MODEL_NAME}")
    print("=" * 60)
    
    # Check Ollama availability
    if not OLLAMA_AVAILABLE:
        print("\n❌ Ollama not installed. Run: pip install ollama")
        return
    
    explainer = LLMExplainer()
    
    if not explainer.available:
        print("\n❌ Ollama not running. Start with: ollama serve")
        return
    
    print("\n✓ Ollama connected, model available")
    
    # Sample facts from rule-based engine
    sample_facts = [
        "Blood sugar increased 29% over 18 months",
        "Blood pressure rose steadily across four visits",
        "Medication was started late in the observation period",
    ]
    
    print("\n📋 Input Facts:")
    for fact in sample_facts:
        print(f"   • {fact}")
    
    print("\n🤖 Generating polished explanation...")
    polished = explainer.polish(sample_facts, "HIGH")
    
    print("\n✨ Polished Output:")
    print(f"   {polished}")
    
    print("\n" + "=" * 60)
    print("✅ LLM Explainer ready for integration")
    print("=" * 60)


if __name__ == "__main__":
    main()
