import { View, Text, TouchableOpacity } from "react-native";

interface TerminalActionsProps {
  onClose: () => void;
}

export function TerminalActions({ onClose }: TerminalActionsProps) {
  const actions = [
    { label: "New Terminal", icon: "＋", color: "#32E0C4", description: "Open a new terminal session" },
    { label: "Split Horizontal", icon: "⬌", color: "#66D9EF", description: "Split pane horizontally" },
    { label: "Split Vertical", icon: "⬍", color: "#66D9EF", description: "Split pane vertically" },
    { label: "Kill Terminal", icon: "✕", color: "#FF5370", description: "Close current terminal" },
    { label: "Kill All", icon: "⊘", color: "#FF5370", description: "Close all terminals" },
    { label: "Rename", icon: "✎", color: "#E6DB74", description: "Rename terminal tab" },
    { label: "Copy", icon: "⧉", color: "#8FA3A8", description: "Copy selection" },
    { label: "Paste", icon: "📋", color: "#8FA3A8", description: "Paste from clipboard" },
    { label: "Clear", icon: "⌧", color: "#8FA3A8", description: "Clear terminal" },
    { label: "Zoom In", icon: "🔍+", color: "#A6E22E", description: "Increase font size" },
    { label: "Zoom Out", icon: "🔍−", color: "#A6E22E", description: "Decrease font size" },
  ];

  return (
    <View style={{ backgroundColor: "#071418", borderTopLeftRadius: 16, borderTopRightRadius: 16, borderWidth: 1, borderColor: "#123238", borderBottomWidth: 0 }}>
      {/* Header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#123238" }}>
        <Text style={{ color: "#32E0C4", fontSize: 13, fontWeight: "600" }}>Terminal</Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={{ color: "#8FA3A8", fontSize: 18 }}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={{ padding: 8 }}>
        {actions.map((action, idx) => (
          <TouchableOpacity
            key={action.label}
            onPress={onClose}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 12,
              paddingVertical: 10,
              borderRadius: 8,
              marginBottom: 2,
            }}
          >
            <View style={{ width: 28, alignItems: "center" }}>
              <Text style={{ color: action.color, fontSize: 14 }}>{action.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#EEEEEE", fontSize: 13 }}>{action.label}</Text>
              <Text style={{ color: "#3D555A", fontSize: 12, marginTop: 1 }}>{action.description}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
