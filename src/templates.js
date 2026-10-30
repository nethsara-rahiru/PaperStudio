export const templates = {
  article: {
    name: "The art of a well-made document",
    label: "Editorial article",
    source: String.raw`\documentclass[11pt,a4paper]{article}
\usepackage[margin=28mm]{geometry}
\usepackage{fontspec}
\usepackage{xcolor}
\usepackage{graphicx}
\usepackage{tikz}
\usepackage{hyperref}
\setmainfont{Latin Modern Roman}
\definecolor{forest}{HTML}{2F5144}
\hypersetup{colorlinks=true,urlcolor=forest}
\title{\color{forest}\Huge The art of a\\well-made document}
\author{A little space for big ideas}
\date{\today}

\begin{document}
\maketitle
\thispagestyle{empty}

\begin{abstract}
Every great idea deserves a beautiful page. This is your
space to think clearly, write freely, and bring something
worth reading into the world.
\end{abstract}

\section{Begin with an idea}
A blank page is an invitation. Whether you are writing a
research paper, preparing a lesson, or exploring a new
thought, good typography lets your ideas take the lead.

PaperStudio brings your words, mathematics, and images
together in one considered workspace.

\section{Make room for discovery}
Some ideas are best expressed in the language of mathematics:
\begin{equation}
  e^{i\pi} + 1 = 0
\end{equation}
Others need a picture. With TikZ, even a simple diagram
can tell a story.

\begin{center}
\begin{tikzpicture}
  \draw[forest, thick, rounded corners=4pt]
    (0,0) rectangle (3,1.1);
  \node[text=forest] at (1.5,.55) {An idea};
  \draw[->, thick, forest] (3.2,.55) -- (4.4,.55);
  \draw[forest, thick, rounded corners=4pt]
    (4.6,0) rectangle (8.6,1.1);
  \node[text=forest] at (6.6,.55) {Something beautiful};
\end{tikzpicture}
\end{center}

\section{Your next chapter}
This is only the beginning. Try the Sinhala template,
upload an image, or make this document your own.
\end{document}
`,
  },
  sinhala: {
    name: "සිංහල ලේඛනය",
    label: "Sinhala document",
    source: String.raw`\documentclass[12pt,a4paper]{article}
\usepackage[margin=25mm]{geometry}
\usepackage{fontspec}
\usepackage{graphicx}
\setmainfont{Noto Serif Sinhala}
\newfontfamily\englishfont{Latin Modern Roman}
\title{සිංහල ලේඛනය}
\author{{\englishfont PaperStudio}}
\date{}
\begin{document}
\maketitle
\section{ආයුබෝවන්!}
මෙය සිංහල භාෂාවෙන් සකස් කළ ලේඛනයකි.
ඔබේ අදහස් ලස්සනට ලියන්න. සිංහල අකුරු සහ පිළි නිවැරදිව පෙන්වීමට
අපි යුනිකෝඩ් අකුරු භාවිතා කරමු.

\section{අධ්‍යාපනය}
අධ්‍යාපනය අපේ ජීවිතයට ඉතා වැදගත් වේ.
දැනුම බෙදා ගැනීම තුළින් අපට ලෝකය වෙනස් කළ හැකිය.

{\englishfont English and Sinhala can share the same page.}
\[
  A = \pi r^2
\]
\end{document}
`,
  },
  report: {
    name: "A study in possibility",
    label: "Research report",
    source: String.raw`\documentclass[11pt,a4paper]{article}
\usepackage[margin=25mm]{geometry}
\usepackage{fontspec,graphicx,booktabs,amsmath}
\setmainfont{Latin Modern Roman}
\title{A study in possibility}
\author{Your name}
\date{\today}
\begin{document}
\maketitle
\begin{abstract}
A concise summary of your research, methods, and findings.
\end{abstract}
\tableofcontents
\section{Introduction}
Describe the question that inspired your research.
\section{Methods}
Explain your approach and the evidence you collected.
\begin{equation}
\bar{x} = \frac{1}{n}\sum_{i=1}^{n} x_i
\end{equation}
\section{Results}
\begin{center}
\begin{tabular}{lrr}
\toprule
Condition & Samples & Mean \\
\midrule
Baseline & 24 & 12.4 \\
Treatment & 24 & 18.7 \\
\bottomrule
\end{tabular}
\end{center}
\section{Discussion}
What do your findings mean? What comes next?
\end{document}
`,
  },
};
