import { create } from "zustand";

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  ports: string;
}

export interface DockerImage {
  id: string;
  repository: string;
  tag: string;
  size: string;
}

interface DockerState {
  containers: DockerContainer[];
  images: DockerImage[];
  loading: boolean;

  setContainers: (containers: DockerContainer[]) => void;
  setImages: (images: DockerImage[]) => void;
  setLoading: (loading: boolean) => void;
}

export const useDockerStore = create<DockerState>((set) => ({
  containers: [],
  images: [],
  loading: false,

  setContainers: (containers) => set({ containers }),
  setImages: (images) => set({ images }),
  setLoading: (loading) => set({ loading }),
}));
