import { View, Text, TouchableOpacity, ScrollView } from "react-native";

interface DockerPanelProps {
  onClose: () => void;
}

export function DockerPanel({ onClose }: DockerPanelProps) {
  const containers = [
    { id: "abc123", name: "orphix-postgres", state: "running", status: "Up 2 hours", image: "postgres:16-alpine" },
    { id: "def456", name: "orphix-redis", state: "running", status: "Up 2 hours", image: "redis:7-alpine" },
    { id: "ghi789", name: "orphix-control", state: "exited", status: "Exited (0) 5 min ago", image: "orphix-control:latest" },
  ];

  return (
    <View style={{ backgroundColor: "#071418", borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: "70%", borderWidth: 1, borderColor: "#123238", borderBottomWidth: 0 }}>
      {/* Header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#123238" }}>
        <Text style={{ color: "#32E0C4", fontSize: 13, fontWeight: "600" }}>Docker</Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={{ color: "#8FA3A8", fontSize: 18 }}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }}>
        {containers.map((c) => (
          <View key={c.id} style={{ paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#123238" }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.state === "running" ? "#A6E22E" : c.state === "exited" ? "#FF5370" : "#E6DB74" }} />
                <Text style={{ color: "#EEEEEE", fontSize: 13, fontWeight: "500" }}>{c.name}</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {c.state === "running" ? (
                  <TouchableOpacity style={{ backgroundColor: "rgba(255,83,112,0.1)", borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 }}>
                    <Text style={{ color: "#FF5370", fontSize: 12 }}>Stop</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={{ backgroundColor: "rgba(166,226,46,0.1)", borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 }}>
                    <Text style={{ color: "#A6E22E", fontSize: 12 }}>Start</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={{ backgroundColor: "rgba(50,224,196,0.1)", borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ color: "#32E0C4", fontSize: 12 }}>Logs</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
              <Text style={{ color: "#8FA3A8", fontSize: 13 }}>{c.status}</Text>
              <Text style={{ color: "#3D555A", fontSize: 13 }}>{c.image}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Actions */}
      <View style={{ flexDirection: "row", borderTopWidth: 1, borderTopColor: "#123238", padding: 8, gap: 6 }}>
        {[
          { label: "Compose Up", color: "#A6E22E" },
          { label: "Compose Down", color: "#FF5370" },
          { label: "Prune", color: "#8FA3A8" },
        ].map((action) => (
          <TouchableOpacity key={action.label} style={{ flex: 1, backgroundColor: "#0D1F25", borderRadius: 6, paddingVertical: 8, alignItems: "center", borderWidth: 1, borderColor: "#123238" }}>
            <Text style={{ color: action.color, fontSize: 13, fontWeight: "500" }}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
