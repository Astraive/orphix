import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";

interface GitPanelProps {
  onClose: () => void;
}

export function GitPanel({ onClose }: GitPanelProps) {
  // Mock data — in production, fetch from link API
  const files = [
    { path: "src/app.tsx", status: "M", staged: false },
    { path: "src/utils.ts", status: "A", staged: true },
    { path: "README.md", status: "M", staged: false },
  ];

  const branches = [
    { name: "main", is_current: true },
    { name: "feat/terminal-ui", is_current: false },
    { name: "fix/auth", is_current: false },
  ];

  return (
    <View style={{ backgroundColor: "#071418", borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: "70%", borderWidth: 1, borderColor: "#123238", borderBottomWidth: 0 }}>
      {/* Header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#123238" }}>
        <Text style={{ color: "#32E0C4", fontSize: 13, fontWeight: "600" }}>Git</Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={{ color: "#8FA3A8", fontSize: 18 }}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }}>
        {/* Branch */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#123238" }}>
          <Text style={{ color: "#8FA3A8", fontSize: 12, marginBottom: 6 }}>BRANCH</Text>
          {branches.map((b) => (
            <View key={b.name} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: b.is_current ? "#32E0C4" : "transparent", borderWidth: b.is_current ? 0 : 1, borderColor: "#3D555A" }} />
              <Text style={{ color: b.is_current ? "#EEEEEE" : "#8FA3A8", fontSize: 13, fontFamily: "monospace" }}>{b.name}</Text>
            </View>
          ))}
        </View>

        {/* Changed files */}
        <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
          <Text style={{ color: "#8FA3A8", fontSize: 12, marginBottom: 6 }}>CHANGES</Text>
          {files.map((f) => (
            <View key={f.path} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 }}>
              <View style={{ width: 18, alignItems: "center" }}>
                <Text style={{ color: f.status === "A" ? "#A6E22E" : f.status === "D" ? "#FF5370" : "#E6DB74", fontSize: 13, fontFamily: "monospace" }}>{f.status}</Text>
              </View>
              <Text style={{ color: "#D4D4D4", fontSize: 12, fontFamily: "monospace", flex: 1 }} numberOfLines={1}>{f.path}</Text>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: f.staged ? "#32E0C4" : "#3D555A" }} />
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Actions */}
      <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: "#123238", padding: 8, gap: 6 }}>
        {[
          { label: "Stage All", color: "#32E0C4" },
          { label: "Commit", color: "#A6E22E" },
          { label: "Push", color: "#66D9EF" },
          { label: "Pull", color: "#E6DB74" },
          { label: "Fetch", color: "#8FA3A8" },
        ].map((action) => (
          <TouchableOpacity key={action.label} style={{ flex: 1, backgroundColor: "#0D1F25", borderRadius: 6, paddingVertical: 8, alignItems: "center", borderWidth: 1, borderColor: "#123238" }}>
            <Text style={{ color: action.color, fontSize: 13, fontWeight: "500" }}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
