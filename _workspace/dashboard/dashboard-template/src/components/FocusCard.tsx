import { h } from "preact";

interface Props {
	focus: string;
}

export function FocusCard({ focus }: Props) {
	return (
		<div className="dash-panel">
			<div className="dash-panel-head">
				<span className="dash-panel-label">Current Focus</span>
			</div>
			<div className="dash-panel-body">
				{focus ? (
					<p className="dash-focus-text">{focus}</p>
				) : (
					<p className="dash-mono dash-dim">
						&gt; no focus set today
					</p>
				)}
			</div>
		</div>
	);
}
