#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Kruti Dev 010 (legacy 8-bit) -> Unicode Devanagari.

The HTET papers embed Hindi in the Kruti Dev font with no /ToUnicode map, so a
plain text extraction returns Latin gibberish ("Hkkx" for "भाग"). This module
maps those byte sequences back to Devanagari and then fixes the two orderings
Kruti Dev stores differently from Unicode:

  * i-matra  "f" is typed BEFORE its consonant cluster, Unicode stores it after
  * reph     "Z" is typed AFTER the consonant it belongs to, Unicode stores it
             before

Both reorderings are single-pass on purpose: repeating them would walk a matra
further along the word on every iteration.

    from krutidev import convert
    convert("fuEufyf[kr")     # -> 'निम्नलिखित'
"""
from __future__ import annotations

import re
import sys

# --------------------------------------------------------------------------
# glyph table — longest source string wins, so order here does not matter
# --------------------------------------------------------------------------

MAP: dict[str, str] = {}

MAP.update({
    # independent vowels (multi-char first, resolved by longest-match)
    "vkS": "औ", "vks": "ओ", "vk": "आ", "v": "अ",
    "bZ": "ई", "b": "इ", "Å": "ऊ", "m": "उ", "_": "ऋ",
    ",s": "ऐ", ",": "ए", "vA": "अं",
})

MAP.update({
    # consonants
    "d": "क", "[k": "ख", "x": "ग", "?k": "घ", "³": "ङ",
    "p": "च", "N": "छ", "t": "ज", ">": "झ", "¥": "ञ",
    "V": "ट", "B": "ठ", "M": "ड", "<": "ढ", ".k": "ण",
    "r": "त", "Fk": "थ", "n": "द", "/k": "ध", "u": "न",
    "i": "प", "Q": "फ", "c": "ब", "Hk": "भ", "e": "म",
    ";": "य", "j": "र", "y": "ल", "o": "व",
    "'k": "श", '"k': "ष", "l": "स", "g": "ह", "'": "श्", '"': "ष्",
    "/": "ध्", ".": "ण्",
})

MAP.update({
    # half consonants — Kruti Dev uses the shifted key
    "D": "क्", "[K": "ख्", "X": "ग्", "?K": "घ्",
    "P": "च्", "T": "ज्", ".K": "ण्",
    "R": "त्", "F": "थ्", "/K": "ध्", "U": "न्",
    "I": "प्", "C": "ब्", "H": "भ्", "E": "म्",
    "Y": "ल्", "O": "व्", "'K": "श्", '"K': "ष्", "L": "स्",
})

MAP.update({
    # conjuncts and special ligatures
    "{k": "क्ष", "{": "क्ष्", "=": "त्र", "«": "त्र्", "K": "ज्ञ",
    "Á": "श्र", "Ø": "क्र", "æ": "क्र", "Ý": "ट्र", "ç": "प्र",
    "Ùk": "त्त", "Ù": "त्", "Ë": "क्त", "}": "द्व", ")": "द्ध", "|": "द्य",
    "J": "श्र", "Nn": "छ्द",
    "#": "रु", ":": "रू", "z": "्र", "Z": "र्", "ª": "र्",
})

MAP.update({
    # nukta forms
    "d+": "क़", "[k+": "ख़", "x+": "ग़", "t+": "ज़",
    "M+": "ड़", "<+": "ढ़", "Q+": "फ़",
})

MAP.update({
    # matras
    "k": "ा", "f": "ि", "h": "ी", "q": "ु", "w": "ू", "`": "ृ",
    "s": "े", "S": "ै", "ks": "ो", "kS": "ौ", "kW": "\u0949", "W": "\u0949",
    "vkW": "\u0911", "vW": "\u0911",
})

MAP.update({
    # signs and punctuation
    "a": "ं", "¡": "ँ", "%": ":", "~": "्", "A": "।", "&": "-",
    "^": "\u2018", "*": "\u2019", "ß": "\u201c", "Þ": "\u201d",
    "]": ",", "¼": "(", "½": ")", "\\": "?", "@": "/", "-": "-",
})

MAP.update({
    # Devanagari digits — comment out this block if you want Latin digits
    "0": "०", "1": "१", "2": "२", "3": "३", "4": "४",
    "5": "५", "6": "६", "7": "७", "8": "८", "9": "९",
})

_KEYS = sorted(MAP, key=len, reverse=True)
_MAXLEN = len(_KEYS[0])

CONS = "\u0915-\u0939\u0958-\u095f"
MATRA = "\u093e-\u094c"
SIGN = "\u0901-\u0903"
HALANT = "\u094d"

_I_MATRA = re.compile(rf"\u093f([{CONS}](?:{HALANT}[{CONS}])*)")
_REPH = re.compile(rf"([{CONS}](?:{HALANT}[{CONS}])*)([{MATRA}{SIGN}]*)\u0930{HALANT}")


def _map_glyphs(text: str) -> str:
    out: list[str] = []
    i, n = 0, len(text)
    while i < n:
        for span in range(min(_MAXLEN, n - i), 0, -1):
            chunk = text[i:i + span]
            if chunk in MAP:
                out.append(MAP[chunk])
                i += span
                break
        else:
            out.append(text[i])
            i += 1
    return "".join(out)


def _dedupe_fake_bold(text: str) -> str:
    """Bold Hindi is stroked several times with a tiny offset; collapse repeats."""
    for reps in (4, 3, 2):
        pat = re.compile(r"(.{2,80}?)\1{%d}" % (reps - 1), re.S)
        prev = None
        while prev != text:
            prev = text
            text = pat.sub(r"\1", text)
    return text


def convert(text: str, dedupe: bool = True, digits: bool = True) -> str:
    """Convert one Kruti Dev string to Unicode Devanagari."""
    if not text:
        return ""
    if dedupe:
        text = _dedupe_fake_bold(text)
    text = _map_glyphs(text)
    text = _I_MATRA.sub(r"\1" + "\u093f", text)          # single pass
    text = _REPH.sub("\u0930\u094d" + r"\1\2", text)  # single pass
    if not digits:
        for dev, lat in zip("०१२३४५६७८९", "0123456789"):
            text = text.replace(dev, lat)
    text = re.sub(r"[ \t]{2,}", " ", text)
    return text.strip()


if __name__ == "__main__":
    src = " ".join(sys.argv[1:]) if len(sys.argv) > 1 else sys.stdin.read()
    print(convert(src))
