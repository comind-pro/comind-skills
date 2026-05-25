import { h } from "preact";

interface Props {
	focus: string;
}

export function FocusCard({ focus }: Props) {
	return (
		<div className="chase-cc-panel">
			<div className="chase-cc-panel-head">
				<span className="chase-cc-panel-label">Current Focus</span>
			</div>
			<div className="chase-cc-panel-body">
				{focus ? (
					<p className="chase-cc-focus-text">{focus}</p>
				) : (
					<p className="chase-cc-mono chase-cc-dim">
						&gt; no focus set today
					</p>
				)}
			</div>
		</div>
	);
}
