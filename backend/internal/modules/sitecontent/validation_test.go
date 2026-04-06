package sitecontent

import "testing"

func TestNormalizePortalActivityDateLabel(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    string
		wantErr bool
	}{
		{name: "valid date", input: "2026-04-06", want: "2026-04-06"},
		{name: "trim spaces", input: " 2026-01-02 ", want: "2026-01-02"},
		{name: "empty", input: "", wantErr: true},
		{name: "wrong format", input: "2026/04/06", wantErr: true},
		{name: "invalid day", input: "2026-02-30", wantErr: true},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			got, err := normalizePortalActivityDateLabel(tc.input)
			if tc.wantErr {
				if err == nil {
					t.Fatalf("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tc.want {
				t.Fatalf("expected %q, got %q", tc.want, got)
			}
		})
	}
}
