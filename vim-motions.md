8. Jumps					*jump-motions*

A "jump" is a command that normally moves the cursor several lines away.  If
you make the cursor "jump" the position of the cursor before the jump is
remembered.  You can return to that position with the "''" and "``" commands,
unless the line containing that position was changed or deleted.  The
following commands are "jump" commands: "'", "`", "G", "/", "?", "n", "N",
"%", "(", ")", "[[", "]]", "{", "}", ":s", ":tag", "L", "M", "H" and the
commands that start editing a new file.

							*CTRL-O*
CTRL-O			Go to [count] Older cursor position in jump list
			(not a motion command).

<Tab>		or					*CTRL-I* *<Tab>*
CTRL-I			Go to [count] newer cursor position in jump list
			(not a motion command).

			NOTE: In the GUI and in a terminal supporting
			|tui-modifyOtherKeys| or |tui-csiu|, CTRL-I can be
			mapped separately from <Tab>, on the condition that
			both keys are mapped, otherwise the mapping applies to
			both. Except in tmux: https://github.com/tmux/tmux/issues/2705

							*:ju* *:jumps*
:ju[mps]		Print the jump list (not a motion command).

							*:cle* *:clearjumps*
:cle[arjumps]		Clear the jump list of the current window.

							*jumplist*
Jumps are remembered in a jump list.  With the CTRL-O and CTRL-I command you
can go to cursor positions before older jumps, and back again.  Thus you can
move up and down the list.  There is a separate jump list for each window.
The maximum number of entries is fixed at 100.

For example, after three jump commands you have this jump list: >

    jump line  col file/text
      3     1    0 some text
      2    70    0 another line
      1  1154   23 end.
   >
<
The "file/text" column shows the file name, or the text at the jump if it is
in the current file (an indent is removed and a long line is truncated to fit
in the window).

The marker ">" indicates the current position in the jumplist.  It may not be
shown when filtering the |:jumps| command using |:filter|

You are currently in line 1167.  If you then use the CTRL-O command, the
cursor is put in line 1154.  This results in: >

    jump line  col file/text
      2     1    0 some text
      1    70    0 another line
   >  0  1154   23 end.
      1  1167    0 foo bar
<
The pointer will be set at the last used jump position.  The next CTRL-O
command will use the entry above it, the next CTRL-I command will use the
entry below it.  If the pointer is below the last entry, this indicates that
you did not use a CTRL-I or CTRL-O before.  In this case the CTRL-O command
will cause the cursor position to be added to the jump list, so you can get
back to the position before the CTRL-O.  In this case this is line 1167.

With more CTRL-O commands you will go to lines 70 and 1.  If you use CTRL-I
you can go back to 1154 and 1167 again.  Note that the number in the "jump"
column indicates the count for the CTRL-O or CTRL-I command that takes you to
this position.

If you use a jump command, the current line number is inserted at the end of
the jump list.  If the same line was already in the jump list, it is removed.
The result is that when repeating CTRL-O you will get back to old positions
only once.

When the |:keepjumps| command modifier is used, jumps are not stored in the
jumplist.  Jumps are also not stored in other cases, e.g., in a |:global|
command.  You can explicitly add a jump by setting the ' mark with "m'".  Note
that calling setpos() does not do this.

After the CTRL-O command that got you into line 1154 you could give another
jump command (e.g., "G").  The jump list would then become: >

    jump line  col file/text
      4     1    0 some text
      3    70    0 another line
      2  1167    0 foo bar
      1  1154   23 end.
   >
<
The line numbers will be adjusted for deleted and inserted lines.  This fails
if you stop editing a file without writing, like with ":n!".

When you split a window, the jumplist will be copied to the new window.

If you have included the ' item in the 'shada' option the jumplist will be
stored in the ShaDa file and restored when starting Vim.

							*jumplist-stack*
When 'jumpoptions' option includes "stack", the jumplist behaves like the tag
stack.  When jumping to a new location from the middle of the jumplist, the
locations after the current position will be discarded. With this option set
you can move through a tree of jump locations. When going back up a branch and
then down another branch, CTRL-O still takes you further up the tree.

Given a jumplist like the following in which CTRL-O has been used to move back
three times to location X: >

     jump line  col file/text
       2  1260    8 mark.c		<-- location X-2
       1   685    0 eval.c		<-- location X-1
    >  0   462   36 eval.c		<-- location X
       1   479   39 eval.c
       2   213    2 mark.c
       3   181    0 mark.c
<
jumping to (new) location Y results in the locations after the current
locations being removed: >

     jump line  col file/text
       3  1260    8 mark.c		<-- location X-2
       2   685    0 eval.c		<-- location X-1
       1   462   36 eval.c		<-- location X
    >
<
Then, when yet another location Z is jumped to, the new location Y appears
directly after location X in the jumplist and location X remains in the same
position relative to the locations (X-1, X-2, etc., ...) that had been before
it prior to the original jump from X to Y: >

     jump line  col file/text
       4  1260    8 mark.c		<-- location X-2
       3   685    0 eval.c		<-- location X-1
       2   462   36 eval.c		<-- location X
       1   100    0 buffer.c		<-- location Y
    >
<
CHANGE LIST JUMPS			*changelist* *change-list-jumps* *E664*

When making a change the cursor position is remembered.  One position is
remembered for every change that can be undone, unless it is close to a
previous change.  Two commands can be used to jump to positions of changes,
also those that have been undone:

							*g;* *E662*
g;			Go to [count] older position in change list.
			If [count] is larger than the number of older change
			positions go to the oldest change.
			If there is no older change an error message is given.
			(not a motion command)

							*g,* *E663*
g,			Go to [count] newer position in change list.
			Just like |g;| but in the opposite direction.
			(not a motion command)

When using a count you jump as far back or forward as possible.  Thus you can
use "999g;" to go to the first change for which the position is still
remembered.  The number of entries in the change list is fixed and is the same
as for the |jumplist|.

When two undo-able changes are in the same line and at a column position less
than 'textwidth' apart only the last one is remembered.  This avoids that a
sequence of small changes in a line, for example "xxxxx", adds many positions
to the change list.  When 'textwidth' is zero 'wrapmargin' is used.  When that
also isn't set a fixed number of 79 is used.  Detail: For the computations
bytes are used, not characters, to avoid a speed penalty (this only matters
for multibyte encodings).

Note that when text has been inserted or deleted the cursor position might be
a bit different from the position of the change.  Especially when lines have
been deleted.

When the `:keepjumps` command modifier is used the position of a change is not
remembered.

							*:changes*
:changes		Print the change list.  A ">" character indicates the
			current position.  Just after a change it is below the
			newest entry, indicating that `g;` takes you to the
			newest entry position.  The first column indicates the
			count needed to take you to this position.  Example:

				change line  col text ~
				    3     9    8 bla bla bla
				    2    11   57 foo is a bar
				    1    14   54 the latest changed line
				>

			The `3g;` command takes you to line 9.  Then the
			output of `:changes` is:

				change line  col text ~
				>   0     9    8 bla bla bla
				    1    11   57 foo is a bar
				    2    14   54 the latest changed line

			Now you can use "g," to go to line 11 and "2g," to go
			to line 14.

==============================================================================
9. Various motions				*various-motions*

							*%*
%			Find the next item in this line after or under the
			cursor and jump to its match. |inclusive| motion.
			Items can be:
			([{}])		parenthesis or (curly/square) brackets
					(this can be changed with the
					'matchpairs' option)
			`/* */`		start or end of C-style comment
			#if, #ifdef, #else, #elif, #endif
					C preprocessor conditionals (when the
					cursor is on the # or no ([{
					is following)
			For other items the matchit plugin can be used, see
			|matchit|.  This plugin also helps to skip matches in
			comments.

			When 'cpoptions' contains "M" |cpo-M| backslashes
			before parens and braces are ignored.  Without "M" the
			number of backslashes matters: an even number doesn't
			match with an odd number.  Thus in "( \) )" and "\( (
			\)" the first and last parenthesis match.

			When the '%' character is not present in 'cpoptions'
			|cpo-%|, parens and braces inside double quotes are
			ignored, unless the number of parens/braces in a line
			is uneven and this line and the previous one does not
			end in a backslash.  '(', '{', '[', ']', '}' and ')'
			are also ignored (parens and braces inside single
			quotes).  Note that this works fine for C, but not for
			Perl, where single quotes are used for strings.

			Nothing special is done for matches in comments.  You
			can either use the |matchit| plugin or put quotes around
			matches.

			No count is allowed, {count}% jumps to a line {count}
			percentage down the file |N%|.  Using '%' on
			#if/#else/#endif makes the movement linewise.

						*[(*
[(			Go to [count] previous unmatched '('.
			|exclusive| motion.

						*[{*
[{			Go to [count] previous unmatched '{'.
			|exclusive| motion.

						*])*
])			Go to [count] next unmatched ')'.
			|exclusive| motion.

						*]}*
]}			Go to [count] next unmatched '}'.
			|exclusive| motion.

The above four commands can be used to go to the start or end of the current
code block.  It is like doing "%" on the "(", ")", "{" or "}" at the other
end of the code block, but you can do this from anywhere in the code block.
Very useful for C programs.  Example: When standing on "case x:", `[{` will
bring you back to the switch statement.

						*]m*
]m			Go to [count] next start of a method (for Java or
			similar structured language).  When not before the
			start of a method, jump to the start or end of the
			class.  |exclusive| motion.
						*]M*
]M			Go to [count] next end of a method (for Java or
			similar structured language).  When not before the end
			of a method, jump to the start or end of the class.
			|exclusive| motion.
						*[m*
[m			Go to [count] previous start of a method (for Java or
			similar structured language).  When not after the
			start of a method, jump to the start or end of the
			class.  When no '{' is found before the cursor this is
			an error. |exclusive| motion.
						*[M*
[M			Go to [count] previous end of a method (for Java or
			similar structured language).  When not after the
			end of a method, jump to the start or end of the
			class.  When no '}' is found before the cursor this is
			an error. |exclusive| motion.

The above two commands assume that the file contains a class with methods.
The class definition is surrounded in '{' and '}'.  Each method in the class
is also surrounded with '{' and '}'.  This applies to the Java language.  The
file looks like this: >

	// comment
	class foo {
		int method_one() {
			body_one();
		}
		int method_two() {
			body_two();
		}
	}

[To try this out copy the text and put it in a new buffer, the help text above
confuses the jump commands]

Starting with the cursor on "body_two()", using "[m" will jump to the '{' at
the start of "method_two()" (obviously this is much more useful when the
method is long!).  Using "2[m" will jump to the start of "method_one()".
Using "3[m" will jump to the start of the class.

						*[#*
[#			Go to [count] previous unmatched "#if" or "#else".
			|exclusive| motion.

						*]#*
]#			Go to [count] next unmatched "#else" or "#endif".
			|exclusive| motion.

These two commands work in C programs that contain #if/#else/#endif
constructs.  It brings you to the start or end of the #if/#else/#endif where
the current line is included.  You can then use "%" to go to the matching line.

						*[star* *[/*
[*  or  [/		Go to [count] previous start of a C comment "/*".
			|exclusive| motion.

						*]star* *]/*
]*  or  ]/		Go to [count] next end of a C comment "*/".
			|exclusive| motion.


						*H*
H			To line [count] from top (Home) of window (default:
			first line on the window) on the first non-blank
			character |linewise|.  See also 'startofline' option.
			Cursor is adjusted for 'scrolloff' option, unless an
			operator is pending, in which case the text may
			scroll.  E.g. "yH" yanks from the first visible line
			until the cursor line (inclusive).

						*M*
M			To Middle line of window, on the first non-blank
			character |linewise|.  See also 'startofline' option.

						*L*
L			To line [count] from bottom of window (default: Last
			line on the window) on the first non-blank character
			|linewise|.  See also 'startofline' option.
			Cursor is adjusted for 'scrolloff' option, unless an
			operator is pending, in which case the text may
			scroll.  E.g. "yL" yanks from the cursor to the last
			visible line.

<LeftMouse>		Moves to the position on the screen where the mouse
			click is |exclusive|.  See also |<LeftMouse>|.  If the
			position is in a status line, that window is made the
			active window and the cursor is not moved.

 vim:tw=78:ts=8:noet:ft=help:norl:
